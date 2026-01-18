import cardModel from '../models/card.js'
import setModel from '../models/set.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync"; 
import * as nextcloud from "../services/nextcloudClient.js"; // uploadBufferAndShare, deleteShare, deleteFile
import fs from 'fs';
import mime from "mime-types";

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

/*
Expects:
Zipfile: zip containing:
- Name
- Subtitle
- Rarity (Common, Rare, Ultra Rare)
- Num
- setRef (optional) : SetNo or ObjectId string
- ArtworkFile (filename under images/)
- Power (0-5)
- Speed (0-5)
- Special (0-5)

2) images/ folder with artwork files matching ArtworkFile
*/
export const addMany = async (req, res) => {
    const session = await mongoose.startSession();

    //Keep track of uploaded Nextcloud assets so we can clean them up on failure
     const uploadedAssets = []; // { shareId, ncPath }

    try {
        if (!req.file) throw new DBError("No Zipfile Was Given", 404);

        //Read zip contents
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        let csvData = null;
        const images = new Map(); // { buffer, contentType, originalName }

        for (const entry of entries) {
        if (entry.isDirectory) continue;

        if (/metadata\.csv$/i.test(entry.entryName) || /\.csv$/i.test(entry.entryName)) {
            //Prefer metadata.csv, but allow any .csv if only one exists
            csvData = entry.getData().toString("utf-8");
        } else if (/^images\/.+\.(png|jpe?g|gif|webp)$/i.test(entry.entryName)) {
            const filename = entry.entryName.split("/").pop();
            const buffer = entry.getData();
            const contentType = mime.lookup(filename) || "application/octet-stream";
            images.set(filename, { buffer, contentType, originalName: filename });
        }
        }

        if (!csvData) throw new DBError("metadata.csv not found in zip", 400);

        //Parse CSV 
        const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        });

        if (!Array.isArray(records) || records.length === 0) {
        throw new DBError("metadata.csv has no rows", 400);
        }

        // Validate rows + ensure referenced images exist
        const work = records.map((row, idx) => {
        const Name = row.Name;
        const Subtitle = row.Subtitle;
        const Rarity = row.Rarity;
        const Num = row.Num;
        const setRef = row.setRef || row.SetRef || null;
        const ArtworkFile = row.ArtworkFile;

        const Power = Number(row.Power);
        const Speed = Number(row.Speed);
        const Special = Number(row.Special);

        if (!ArtworkFile) throw new DBError(`Row ${idx + 1}: ArtworkFile missing`, 400);

        const artwork = images.get(ArtworkFile);
        if (!artwork) throw new DBError(`Row ${idx + 1}: Image ${ArtworkFile} not found in zip`, 400);

        return {
            Name,
            Subtitle,
            Rarity,
            Num,
            setRef,
            artwork,
            Power,
            Speed,
            Special,
            rowIndex: idx + 1,
        };
        });

    //Upload ALL artworks to Nextcloud
    const batchFolder = "";

    for (const item of work) {
        const uploaded = await nextcloud.uploadBufferAndShare({
            buffer: item.artwork.buffer,
            originalName: item.artwork.originalName,
            folder: batchFolder,
        });

    if (!uploaded?.shareId || !uploaded?.ncPath || !uploaded?.downloadUrl) {
        throw new DBError(`Nextcloud upload failed for row ${item.rowIndex}`, 500);
    }

    uploadedAssets.push({ shareId: uploaded.shareId, ncPath: uploaded.ncPath });

    item.artworkRef = {
        ncPath: uploaded.ncPath,
        shareId: uploaded.shareId,
        shareUrl: uploaded.shareUrl,
        downloadUrl: uploaded.downloadUrl,
        contentType: uploaded.mimeType, 
        originalName: item.artwork.originalName,
        size: uploaded.size,
    };
    }

    //Create all cards inside a single Mongo transaction
    const savedCards = await session.withTransaction(async () => {
        const created = [];

        for (const item of work) {
        const card = await internalAddCard(
            item.Name,
            item.Subtitle,
            item.Rarity,
            item.Num,
            item.setRef,
            item.artworkRef,
            item.Power,
            item.Speed,
            item.Special,
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
        cardIDs: savedCards.map((c) => c.SearchID), // nicer than _id for your app
    });
    } catch (error) {
    session.endSession();

    //Cleanup Nextcloud uploads if anything failed
    for (const asset of uploadedAssets) {
        try {
        if (asset.shareId) await nextcloud.deleteShare(asset.shareId);
        } catch {}
        try {
        if (asset.ncPath) await nextcloud.deleteFile(asset.ncPath);
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
        } else {
        message = "Duplicate field value entered.";
        }
    }

    return res.status(code).json({ message });
    }
};

/*
Expects:
ID: String (_id or SearchID)
Name: String (optional)
Subtitle: String (optional)
Rarity: String enum (Common, Rare, Ultra Rare) (optional)
Num: Number (optional)
Artwork: file [.jpg, .png, .gif, .webp] (optional)
Power: Number (0–5) (optional)
Speed: Number (0–5) (optional)
Special: Number (0–5) (optional)
*/
export const editCard = async (req, res) => {
    const session = await mongoose.startSession();
    const validRarities = ["Common", "Rare", "Ultra Rare"];

    // Track uploads for cleanup if DB fails
    let newArtworkUpload = null;

    // Track old artwork for deletion after successful commit
    let oldArtworkToDelete = null;

    try {
        const body = req.body || {};
        if (!body.ID) throw new DBError("No Card ID given!", 404);

        // If a new file was sent, upload it to Nextcloud first
        if (req.file) {
        newArtworkUpload = await nextcloud.uploadBufferAndShare({
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            folder: "", 
        });

        if (!newArtworkUpload?.shareId || !newArtworkUpload?.ncPath || !newArtworkUpload?.downloadUrl) {
            throw new DBError("Nextcloud upload did not return required fields", 500);
        }
        }

        // update fields + swap artwork ref
        await session.withTransaction(async () => {
        let card = null;

        if (mongoose.Types.ObjectId.isValid(body.ID)) {
            card = await cardModel.findById(body.ID).session(session);
        }
        if (!card) {
            card = await cardModel.findOne({ SearchID: body.ID }).session(session);
        }
        if (!card) throw new DBError("Card Not Found", 404);

        // Save old artwork info so we can delete AFTER commit
        if (newArtworkUpload) {
            oldArtworkToDelete = card.Artwork
            ? { shareId: card.Artwork.shareId, ncPath: card.Artwork.ncPath }
            : null;

            card.Artwork = {
            ncPath: newArtworkUpload.ncPath,
            shareId: newArtworkUpload.shareId,
            shareUrl: newArtworkUpload.shareUrl,
            downloadUrl: newArtworkUpload.downloadUrl,
            contentType: newArtworkUpload.mimeType ?? req.file.mimetype,
            originalName: req.file.originalname,
            size: newArtworkUpload.size ?? req.file.size,
            status: "active",
            uploadedAt: new Date(),
            };
        }

        // Normal field edits
        if (body.Name) card.Name = body.Name;
        if (body.Subtitle) card.Subtitle = body.Subtitle;

        if (body.Rarity) {
            if (!validRarities.includes(body.Rarity)) {
            throw new DBError(`Invalid Rarity: must be one of ${validRarities.join(", ")}`, 400);
            }
            card.Rarity = body.Rarity;
        }

        if (body.Num !== undefined) card.Num = Number(body.Num);

        if (body.Power !== undefined) {
            const p = Number(body.Power);
            if (p < 0 || p > 5) throw new DBError("Power must be between 0 and 5", 400);
            card.Power = p;
        }

        if (body.Speed !== undefined) {
            const s = Number(body.Speed);
            if (s < 0 || s > 5) throw new DBError("Speed must be between 0 and 5", 400);
            card.Speed = s;
        }

        if (body.Special !== undefined) {
            const sp = Number(body.Special);
            if (sp < 0 || sp > 5) throw new DBError("Special must be between 0 and 5", 400);
            card.Special = sp;
        }

        // Duplicate check (Set + Num)
        if (card.Set && card.Num !== undefined) {
            const existingCard = await cardModel.findOne({
            _id: { $ne: card._id },
            Set: card.Set,
            Num: card.Num,
            }).session(session);

            if (existingCard) {
            throw new DBError("A card with this number already exists in the given set.", 400);
            }
        }

        await card.save({ session });
        });

        session.endSession();

        //delete old Nextcloud asset
        if (newArtworkUpload && oldArtworkToDelete?.shareId) {
        try { await nextcloud.deleteShare(oldArtworkToDelete.shareId); } catch {}
        }
        if (newArtworkUpload && oldArtworkToDelete?.ncPath) {
        try { await nextcloud.deleteFile(oldArtworkToDelete.ncPath); } catch {}
        }

        return res.status(200).json({ cardID: body.ID, message: "Card successfully edited" });
    } catch (error) {
        session.endSession();

        //cleanup new upload
        if (newArtworkUpload?.shareId) {
        try { await nextcloud.deleteShare(newArtworkUpload.shareId); } catch {}
        }
        if (newArtworkUpload?.ncPath) {
        try { await nextcloud.deleteFile(newArtworkUpload.ncPath); } catch {}
        }

        let code = 500;
        let message = error?.message || "Server error";

        if (error instanceof DBError) {
        code = error.statusCode;
        } else if (error?.code === 11000) {
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
    try {
        const { ID, Name } = req.query;

        let cards = [];

        if (ID) {
        let card = null;

        if (mongoose.Types.ObjectId.isValid(ID)) {
            card = await cardModel.findById(ID);
        }
        if (!card) {
            card = await cardModel.findOne({ SearchID: ID });
        }

        if (!card) throw new DBError("Card Not Found", 404);
        cards = [card];
        } else if (Name) {
        cards = await cardModel.find({ Name });
        if (cards.length === 0) throw new DBError("No cards found with that name", 404);
        } else {
        throw new DBError("No ID or Name provided to search for card(s)", 400);
        }

        return res.status(200).json({
        count: cards.length,
        cards: cards.map((c) => c.toObject()),
        });
    } catch (error) {
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
    let artworkToDelete = null;

    try {
        await session.withTransaction(async () => {
        const cardID = req.body?.cardID || req.query?.cardID;
        if (!cardID) throw new DBError("No cardID provided", 400);
        let card = null;

        if (mongoose.Types.ObjectId.isValid(cardID)) {
            card = await cardModel.findById(cardID).session(session);
        }
        if (!card) {
            card = await cardModel.findOne({ SearchID: cardID }).session(session);
        }
        if (!card) throw new DBError("Card Not Found", 404);

        if (card.Artwork?.ncPath || card.Artwork?.shareId) {
            artworkToDelete = {
            ncPath: card.Artwork.ncPath,
            shareId: card.Artwork.shareId,
            };
        }
        await internalRemoveFromSet(card._id.toString(), session);
        await cardModel.deleteOne({ _id: card._id }).session(session);
        });

        session.endSession();
        if (artworkToDelete?.shareId) {
        try { await nextcloud.deleteShare(artworkToDelete.shareId); } catch {}
        }
        if (artworkToDelete?.ncPath) {
        try { await nextcloud.deleteFile(artworkToDelete.ncPath); } catch {}
        }

        return res.status(200).json({ message: "Card deleted." });
    } catch (error) {
        session.endSession();
        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};


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
try {
    const { ID } = req.query;
    if (!ID) throw new DBError("No ID provided", 400);

    let card = await cardModel.findOne({ SearchID: ID });
    if (!card && mongoose.Types.ObjectId.isValid(ID)) {
    card = await cardModel.findById(ID);
    }

    if (!card) throw new DBError("Card Not Found", 404);

    let SetNo = null;
    if (card.Set) {
    const setDoc = await setModel.findById(card.Set);
    SetNo = setDoc ? setDoc.SetNo : null;
    }

    return res.status(200).json({
    ...card.toObject(),
    SetNo,
    });
} catch (error) {
    const code = error instanceof DBError ? error.statusCode : 500;
    return res.status(code).json({ message: error.message });
}
};
