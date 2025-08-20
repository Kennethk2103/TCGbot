import cardModel from '../models/card.js'
import setModel from '../models/set.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync"; 


async function internaladdCard(Name, Subtitle, Rarity, Num, setRef, Artist, Artwork, session) {
    const validRarities = ['Common', 'Rare', 'Ultra Rare'];

    if (!Name) throw new DBError("No Name Was Given", 404);
    if (!Subtitle) throw new DBError("No Subtitle Was Given", 404);
    if (!Rarity) throw new DBError("No Rarity Was Given", 404);
    if (!validRarities.includes(Rarity)) throw new DBError(`Invalid Rarity: must be one of ${validRarities.join(', ')}`, 400);
    if (!Num) throw new DBError("No Num Was Given", 404);
    if (!Artwork) throw new DBError("No Artwork Was Given", 404);
    if (!Artist) throw new DBError("No Artist Was Given", 404);

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

    let card = new cardModel({
        Name,
        Subtitle,
        Rarity,
        Set: setId,
        Num,
        Artist, 
        Artwork: {
            data: Artwork.data,
            contentType: Artwork.contentType
        }
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
Artist: String 
Artwork: file [.jpg, .png, .gif]
*/
export const addCard = async (req, res) => {
    const session = await mongoose.startSession();
    const validRarities = ['Common', 'Rare', 'Ultra Rare'];

    try {
        const savedCard = await session.withTransaction(async () => {
            const body = req.body;
            console.log("Request body:", body);
            const Artwork = {
                data: (req.body.Artwork.data) ? req.body.Artwork.data : req.file.buffer,
                contentType: (req.body.Artwork.contentType) ? req.body.Artwork.contentType : req.file.mimetype
            };
            const setRef = req.body.SetRef?.trim() || null;
            return internaladdCard(body.Name, body.Subtitle, body.Rarity, body.Num, setRef, body.Artist, Artwork, session)
        });

        session.endSession();
        return res.status(200).json({ cardID: savedCard._id, message: "Card successfully created" });
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
2. images/: a folder containing images with the filenames matching the ArtworkFile column in metadata.csv
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
                        contentType: getMimeType(filename) // helper fn below
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
                    ArtworkFile 
                } = row;

                const Artwork = images[ArtworkFile];
                if (!Artwork) throw new DBError(`Image ${ArtworkFile} not found in zip`, 400);

                const card = await internaladdCard(
                    Name,
                    Subtitle,
                    Rarity,
                    Num,
                    setRef,
                    Artist,
                    Artwork,
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

            const card = await cardModel.findById(body.ID).session(session);
            if (!card) throw new DBError("Card Not Found", 404);

            if (body.Name) card.Name = body.Name;
            if (body.Subtitle) card.Subtitle = body.Subtitle;
            if (body.Rarity) {
                if (!validRarities.includes(body.Rarity)) {
                    throw new DBError(`Invalid Rarity: must be one of ${validRarities.join(', ')}`, 400);
                }
                card.Rarity = body.Rarity;
            }
            if (body.Num) card.Num = body.Num;
            if (body.Artist) card.Artist = body.Artist

            if (body.Artwork) {
                card.Artwork = {
                    data: body.Artwork.data,
                    contentType: body.Artwork.contentType
                };
            }

            const existingCard = await cardModel.findOne({
                _id: { $ne: card._id }, 
                Set: newSetId,
                Num: newNum
            }).session(session);
        
            if (existingCard) {
                throw new DBError("A card with this number already exists in the given set.", 400);
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
                const card = await cardModel.findById(ID).session(session);
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
            Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
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
        const card = await cardModel.findById(cardID).session(session);
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
    const card = await cardModel.findById(cardID).session(session);
    if (!card) throw new DBError("Card Not Found", 404);

    let set;
    if (mongoose.Types.ObjectId.isValid(setRef)) {
        set = await setModel.findById(setRef).session(session);
    } else if (typeof setRef === 'number') {
        set = await setModel.findOne({ SetNo: setRef }).session(session);
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
            } else if (!isNaN(setRef)) {
                set = await setModel.findOne({ SetNo: Number(setRef) }).session(session);
            }

            if (!set) throw new DBError("Set Not Found", 404);

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
            await cardModel.findByIdAndDelete(cardID).session(session)
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
        const { setNum, cardNum } = req.query;
        if (!setNum) throw new DBError("No setNum provided", 400);
        if (!cardNum) throw new DBError("No cardNum provided", 400);

        let set;
        if (!isNaN(setNum)) {
            set = await setModel.findOne({ SetNo: Number(setNum) }).session(session);
        }
        if (!set) throw new DBError("Set Not Found", 404);  
        const card = await cardModel.findOne({ Set: set._id, Num: Number(cardNum) }).session(session);
        if (!card) throw new DBError("Card Not Found", 404);
        session.endSession();
        const cardResponse = {
            ...card.toObject(),
            Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
        };
        return res.status(200).json(cardResponse);
    } catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
};

//List all cards 