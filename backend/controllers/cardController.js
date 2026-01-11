import cardModel from '../models/card.js'
import setModel from '../models/set.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync"; 
import * as nextcloud from "../services/nextcloudClient.js"; // uploadBufferAndShare, deleteShare, deleteFile
import fs from 'fs';

function generateSearchableID(){
    const characters = '1234567890'
    let result = ''
    for(let i = 0; i < 6; i++){
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

async function internalAddCard(
    Name,
    Subtitle,
    Rarity,
    Num,
    setRef,
    artworkRef, // <- Nextcloud artwork object
    Power,
    Speed,
    Special,
    session
) {
    const validRarities = ["Common", "Rare", "Ultra Rare"];

    if (!Name) throw new DBError("No Name Was Given", 404);
    if (!Subtitle) throw new DBError("No Subtitle Was Given", 404);
    if (!Rarity) throw new DBError("No Rarity Was Given", 404);
    if (!validRarities.includes(Rarity))
    throw new DBError(`Invalid Rarity: must be one of ${validRarities.join(", ")}`, 400);

    if (Num === undefined || Num === null) throw new DBError("No Num Was Given", 404);

  // Artwork now must be a Nextcloud ref object
    if (!artworkRef) throw new DBError("No Artwork Was Given", 404);
    if (!artworkRef.ncPath || !artworkRef.shareId || !artworkRef.downloadUrl)
    throw new DBError("Artwork upload did not return required Nextcloud fields", 500);

    if (Power === undefined || Power === null) throw new DBError("No Power Was Given", 404);
    if (Speed === undefined || Speed === null) throw new DBError("No Speed Was Given", 404);
    if (Special === undefined || Special === null) throw new DBError("No Special Was Given", 404);

    if (Power < 0 || Power > 5) throw new DBError("Power must be between 0 and 5", 400);
    if (Speed < 0 || Speed > 5) throw new DBError("Speed must be between 0 and 5", 400);
    if (Special < 0 || Special > 5) throw new DBError("Special must be between 0 and 5", 400);

  // Resolve setRef (optional)
    let setId;
    if (setRef) {
        let set;
        if (mongoose.Types.ObjectId.isValid(setRef)) {
            set = await setModel.findById(setRef).session(session);
        } else if (!isNaN(setRef)) {
            set = await setModel.findOne({ SetNo: Number(setRef) }).session(session);
        }
    if (!set) throw new DBError("Given set was not found", 404);
        setId = set._id;
    }

    let searchID;
    while (true) {
        searchID = generateSearchableID();
        const existingCard = await cardModel.findOne({ SearchID: searchID }).session(session);
        if (!existingCard) break;
    }

    const card = new cardModel({
        Name,
        Subtitle,
        Rarity,
        Set: setId,
        Num,
        Artwork: {
            ncPath: artworkRef.ncPath,
            shareId: artworkRef.shareId,
            shareUrl: artworkRef.shareUrl,
            downloadUrl: artworkRef.downloadUrl,
            contentType: artworkRef.contentType,
            originalName: artworkRef.originalName,
            size: artworkRef.size,
            status: "active",
            uploadedAt: new Date(),
        },
        Power,
        Speed,
        Special,
        SearchID: searchID,
    });

    const savedCard = await card.save({ session });
    if (!savedCard) throw new DBError("Failed to create new card", 500);

    if (setId) {
        await setModel.updateOne(
        { _id: setId },
        { $push: { cards: savedCard._id } },
        { session }
        );
    }

    return savedCard;
}

/*
Expects:
Name: String 
Subtitle: String 
Rarity: String enum 
Num: Number 
setRef: _id (string) OR SetNo (number) (This is optional.  It may be omitted if the card is not part of a set)
Artwork: file [.jpg, .png, .gif, .webp]
Power: Number (0-5)
Speed: Number (0-5)
Special: Number (0-5)
*/
export const addCard = async (req, res) => {
    const session = await mongoose.startSession();
    let uploadedArtwork = null;

    try {
        console.log("Entered try")
        const body = req.body || {};

        const artworkBuffer =
        body.Artwork?.data ? Buffer.from(body.Artwork.data, "base64") : req.file?.buffer;

        const artworkContentType =
        body.Artwork?.contentType ? body.Artwork.contentType : req.file?.mimetype;

        const artworkOriginalName =
        body.Artwork?.originalName ? body.Artwork.originalName : req.file?.originalname || "artwork";

        if (!artworkBuffer) throw new DBError("No Artwork Was Given", 404);
        if (!artworkContentType) throw new DBError("Artwork contentType is missing", 400);

        uploadedArtwork = await nextcloud.uploadBufferAndShare({
        buffer: artworkBuffer,
        originalName: artworkOriginalName, 
        });

        if (!uploadedArtwork.shareId) {
        throw new DBError("Nextcloud upload did not return shareId (needed for revoke/delete)", 500);
        }

        // ---- 3) Mongo transaction (DB work only) ----
        const savedCard = await session.withTransaction(async () => {
        const setRef = body.SetRef?.trim() || null;

        return internalAddCard(
            body.Name,
            body.Subtitle,
            body.Rarity,
            body.Num,
            setRef,
            {
            ncPath: uploadedArtwork.ncPath,
            shareId: uploadedArtwork.shareId,
            shareUrl: uploadedArtwork.shareUrl,
            downloadUrl: uploadedArtwork.downloadUrl,
            contentType: uploadedArtwork.mimeType, 
            originalName: artworkOriginalName,
            size: uploadedArtwork.size,
            },
            body.Power,
            body.Speed,
            body.Special,
            session
        );
        });

        session.endSession();
        return res.status(200).json({ cardID: savedCard.SearchID, message: "Card successfully created" });
    } catch (error) {
        session.endSession();

        if (uploadedArtwork?.shareId || uploadedArtwork?.ncPath) {
        try {
            if (uploadedArtwork.shareId) await nextcloud.deleteShare(uploadedArtwork.shareId);
        } catch {}
        try {
            if (uploadedArtwork.ncPath) await nextcloud.deleteFile(uploadedArtwork.ncPath);
        } catch {}
        }

        let code = 500;
        let message = error?.message || "Server error";

        if (error instanceof DBError) {
        code = error.statusCode;
        } else if (error?.code === 11000) {
        code = 400;
        if (error.keyPattern?.Set && error.keyPattern?.Num) {
            message = "A card with this number already exists in the given set.";
        } else if (error.keyPattern?.SearchID) {
            message = "Duplicate SearchID generated; please retry.";
        } else {
            message = "Duplicate field value entered.";
        }
        }

        return res.status(code).json({ message });
    }
};

//---------------------------------------------------------------------------------------------------------EVERYTHING BELOW HERE NEEDS TO BE UP`DATED FOR NEXTCLOUD USAGE TOO--------------------------------------------------------------------------------------------------


/*
Expects:
Zipfile: a zip file containing: 
1. metadata.csv with columns:
- Name: String
- Subtitle: String
- Rarity: String enum (Common, Rare, Ultra Rare)
- Num: Number
- setRef: _id (string) OR SetNo (number)
- Artist: String
- ArtworkFile: String (filename of the image in the zip under images/)
- BacksideFile: String (filename of the backside image in the zip under images/)
- Bio: String
- Power: Number (0-5)
- Speed: Number (0-5)
- Special: Number (0-5)
2. images/: a folder containing images with the filenames matching the ArtworkFile and BacksideFile columns in metadata.csv
*/
export const addMany = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const savedCards = await session.withTransaction(async () => {
            if (!req.file) throw new DBError("No Zipfile Was Given", 404);

            const zip = new AdmZip(req.file.buffer);
            const entries = zip.getEntries();

            let csvData = null;
            const images = {};

            for (const entry of entries) {
                if (entry.isDirectory) continue;

                if (/\.csv$/i.test(entry.entryName)) {
                    csvData = entry.getData().toString("utf-8");
                } else if (/images\/.+\.(png|jpe?g|gif)$/i.test(entry.entryName)) {
                    const filename = entry.entryName.split("/").pop();
                    images[filename] = {
                        data: entry.getData(),
                        contentType: getMimeType(filename)
                    };
                }
            }

            if (!csvData) throw new DBError("metadata.csv not found in zip", 400);

            const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true
            });

            const created = [];
            for (const row of records) {
                const {
                    Name,
                    Subtitle,
                    Rarity,
                    Num,
                    setRef,
                    Artist,
                    ArtworkFile,
                    BacksideFile,
                    Bio,
                    Power,
                    Speed,
                    Special
                } = row;

                const Artwork = images[ArtworkFile];
                if (!Artwork) throw new DBError(`Image ${ArtworkFile} not found in zip`, 400);

                const Backside = images[BacksideFile];
                if (!Backside) throw new DBError(`Backside image ${BacksideFile} not found in zip`, 400);

                // Convert Power, Speed, Special to numbers
                const powerNum = Number(Power);
                const speedNum = Number(Speed);
                const specialNum = Number(Special);

                const card = await internaladdCard(
                    Name,
                    Subtitle,
                    Rarity,
                    Num,
                    setRef,
                    Artist,
                    Artwork,
                    Backside,
                    Bio,
                    powerNum,
                    speedNum,
                    specialNum,
                    session
                );

                created.push(card);
            }

            return created;
        });

        session.endSession();
        return res.status(200).json({
            count: savedCards.length,
            message: "Cards successfully created",
            cardIDs: savedCards.map(c => c._id)
        });

    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) {
            code = 400;
            if (error.keyPattern?.Set && error.keyPattern?.Num) {
                message = "A card with this number already exists in the given set.";
            } else {
                message = "Duplicate field value entered.";
            }
        }

        return res.status(code).json({ message });
    }
};

function getMimeType(filename) {
    if (filename.endsWith(".png")) return "image/png";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
    if (filename.endsWith(".gif")) return "image/gif";
    return "application/octet-stream";
}

export const editCard = async (req, res) => {
    const session = await mongoose.startSession();
    const validRarities = ['Common', 'Rare', 'Ultra Rare'];

    try {
        await session.withTransaction(async () => {
            const body = req.body;

            if (!body.ID) throw new DBError("No Card ID given!", 404);

            let card = await cardModel.findById(body.ID).session(session);
            if (!card) {
                card = await cardModel.findOne({ SearchID: body.ID }).session(session);
            }
            if (!card) throw new DBError("Card Not Found", 404);

            if (body.Name) card.Name = body.Name;
            if (body.Subtitle) card.Subtitle = body.Subtitle;
            if (body.Rarity) {
                if (!validRarities.includes(body.Rarity)) {
                    throw new DBError(`Invalid Rarity: must be one of ${validRarities.join(', ')}`, 400);
                }
                card.Rarity = body.Rarity;
            }
            if (body.Num !== undefined) card.Num = body.Num;
            if (body.Artist) card.Artist = body.Artist;
            if (body.Artwork) {
                card.Artwork = {
                    data: body.Artwork.data,
                    contentType: body.Artwork.contentType
                };
            }
            if (body.Bio) card.Bio = body.Bio;
            if (body.Power !== undefined) {
                if (body.Power < 0 || body.Power > 5) throw new DBError("Power must be between 0 and 5", 400);
                card.Power = body.Power;
            }
            if (body.Speed !== undefined) {
                if (body.Speed < 0 || body.Speed > 5) throw new DBError("Speed must be between 0 and 5", 400);
                card.Speed = body.Speed;
            }
            if (body.Special !== undefined) {
                if (body.Special < 0 || body.Special > 5) throw new DBError("Special must be between 0 and 5", 400);
                card.Special = body.Special;
            }

            // If editing Num or Set, check for duplicate in set
            if (card.Set && card.Num !== undefined) {
                const existingCard = await cardModel.findOne({
                    _id: { $ne: card._id },
                    Set: card.Set,
                    Num: card.Num
                }).session(session);

                if (existingCard) {
                    throw new DBError("A card with this number already exists in the given set.", 400);
                }
            }

            await card.save({ session });
        });

        session.endSession();
        return res.status(200).json({ cardID: req.body.ID, message: "Card successfully edited" });

    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) {
            code = 400;
            if (error.keyPattern?.Set && error.keyPattern?.Num) {
                message = "A card with this number already exists in the given set.";
            } else {
                message = "Duplicate field value entered.";
            }
        }

        return res.status(code).json({ message });
    }
};


export const getCard = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { ID, Name } = req.query;

        let cards;

        await session.withTransaction(async () => {
            if (ID) {
                var card = await cardModel.findById(ID).session(session);
                if(!card){
                    card = await cardModel.findOne({ SearchID: ID }).session(session);
                }
                if (!card) throw new DBError("Card Not Found", 404);
                cards = [card];
            } else if (Name) {
                cards = await cardModel.find({ Name }).session(session);
                if (cards.length === 0) throw new DBError("No cards found with that name", 404);
            } else {
                throw new DBError("No ID or Name provided to search for card(s)", 400);
            }
        });

        session.endSession();

        const cardResponses = cards.map(card => ({
            ...card.toObject(),
           
        }));

        return res.status(200).json({
            count: cardResponses.length,
            cards: cardResponses
        });

    } catch (error) {
        session.endSession();

        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};


async function internalRemoveFromSet(cardID, session) {
    try {
        let card = await cardModel.findById(cardID).session(session);
        if (!card) {
            card = await cardModel.findOne({ SearchID: cardID }).session(session);
        }
        if (!card) throw new DBError("Card Not Found", 404);

        const set = await setModel.findById(card.Set).session(session);

        if (set) {
            await setModel.updateOne(
                { _id: set._id },
                { $pull: { cards: card._id } },
                { session }
            );
        }
        card.Set = null;
        await card.save({ session });

        return { success: true };
    } catch (error) {
        throw error;
    }
}

async function internalAddToSet(cardID, setRef, newNum, session) {
    var card = await cardModel.findById(ID).session(session);
    if(!card){
        card = await cardModel.findOne({ SearchID: ID }).session(session);
    }
    if (!card) throw new DBError("Card Not Found", 404);

    let set;
    if (mongoose.Types.ObjectId.isValid(setRef)) {
        set = await setModel.findById(setRef).session(session);
    } 
    if(!set ){
        if (!isNaN(setRef)) {
            set = await setModel.findOne({ SetNo: Number(setRef) }).session(session);
        }
    }

    if (!set) throw new DBError("Set Not Found", 404);

    const finalNum = newNum !== undefined ? newNum : card.Num;

    const existingCard = await cardModel.findOne({
        _id: { $ne: card._id },
        Set: set._id,
        Num: finalNum
    }).session(session);

    if (existingCard) {
        throw new DBError("A card with this number already exists in the given set.", 400);
    }

    await setModel.updateOne(
        { _id: set._id },
        { $addToSet: { cards: cardID } },
        { session }
    );

    card.Set = set._id;
    card.Num = finalNum;
    await card.save({ session });
}


/*
EXPECTS: 
cardID, setRef, NewNum
setRef can either be _id or SetNo 
NewNum is optional!! if left undefined card will try to use the same number 
*/
export const addOrMoveTOSet = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { cardID, setRef, NewNum } = req.body; 

            if (!cardID) throw new DBError("No cardID provided", 400);
            if (!setRef) throw new DBError("No set reference provided", 400);

            let set;
            if (mongoose.Types.ObjectId.isValid(setRef)) {
                set = await setModel.findById(setRef).session(session);
            } 
            if (!set) {
                set = await setModel.findOne({ SetNo: new Number(setRef) }).session(session);
            }

            if (!set) throw new DBError("Set Not Found", 404);
            console.log("Set found: ", set);

            await internalRemoveFromSet(cardID, session);
            await internalAddToSet(cardID, set._id, NewNum, session);
        });

        session.endSession();
        return res.status(200).json({ message: "Card added/moved to set." });

    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) {
            code = 400;
            if (error.keyPattern?.Set && error.keyPattern?.Num) {
                message = "A card with this number already exists in the given set.";
            } else {
                message = "Duplicate field value entered.";
            }
        }

        return res.status(code).json({ message });
    }
};



export const removeCardFromSet = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const { cardID } = req.body;
            if (!cardID) throw new DBError("No cardID provided", 400);

            await internalRemoveFromSet(cardID, session);
        })
        session.endSession();
        return res.status(200).json({ message: "Card removed from set." });
    } catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
};

export const deleteCard = async (req, res) => {
    const session = await mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            const { cardID } = req.body;
            if (!cardID) throw new DBError("No cardID provided", 400);

            await internalRemoveFromSet(cardID, session);
            var deletedcard = await cardModel.findByIdAndDelete(cardID).session(session)
            if(!deletedcard){
                deletedcard = await cardModel.findOneAndDelete({ SearchID: cardID }).session(session);
            }
            if(!deletedcard) throw new DBError("Card Not Found", 404);
        })
        session.endSession();
        return res.status(200).json({ message: "Card deleted." });
    } catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
}

export const getAllCards = async (req, res) => {
    const session = await mongoose.startSession(); 
    try{
        const cards = await session.withTransaction(async () => {
            const allCards = await cardModel.find({}).session(session)
            return allCards
        })
        session.endSession()
        const cardResponses = cards.map((card) => ({
            ...card.toObject(),
            Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
        }));
        return res.status(200).json({
            count: cardResponses.length,
            cards: cardResponses
        });
    } catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
}

export const getCardForDiscordSoIDontWantToDie = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { ID } = req.query;
        if (!ID) throw new DBError("No ID provided", 400);

        let card = await cardModel.findOne({ SearchID: ID }).session(session);
        if (!card) {
            card = await cardModel.findById(ID).session(session);
        }
        const setNum = card.set ? (await setModel.findById(card.Set).session(session)).SetNo : null;

        if (!card) throw new DBError("Card Not Found", 404);

        session.endSession();
        const cardResponse = {
            ...card.toObject(),
            SetNo: setNum,
            
        };
        return res.status(200).json(cardResponse);
    } catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
};