import setModel from '../models/set.js'
import cardModel from '../models/card.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';

/*
Expects: 
- Name
- SetNo
*/ 
export const addEmptySet = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const newSet = await session.withTransaction(async () => {
            const body = req.body;

            if (!body.Name) {
                throw new DBError("No Name Was Given", 404);
            }

            if (!body.SetNo) {
                throw new DBError("No Set Number Was Given", 404);
            }

            // Pre-check for uniqueness
            const Eset = await setModel.findOne({ Name: body.Name }).session(session);
            const Bset = await setModel.findOne({ SetNo: body.SetNo }).session(session);

            if (Eset || Bset) {
                throw new DBError("Set with this name or Set Number already exists", 400);
            }

            let set = new setModel({
                Name: body.Name,
                SetNo: body.SetNo,
                cards: []
            });

            const savedSet = await set.save({ session });

            if (!savedSet) {
                throw new DBError("Failed to create new set", 500);
            }

            return savedSet;
        });

        session.endSession();
        return res.status(200).json({ setId: newSet._id, message: "Set successfully created" });

    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) { 
            code = 400;
            if (error.keyPattern?.SetNo) {
                message = "A set with this Set Number already exists.";
            } else if (error.keyPattern?.Name) {
                message = "A set with this Name already exists.";
            } else {
                message = "Duplicate field value entered.";
            }
        }

        return res.status(code).json({ message });
    }
};

export const deleteSet = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const { ID, SetNo } = req.body;
            let set;

            if (ID) {
                set = await setModel.findById(ID).session(session);
            } else if (SetNo) {
                set = await setModel.findOne({ SetNo }).session(session);
            } else {
                throw new DBError("No Set ID or SetNo provided", 400);
            }

            if (!set) throw new DBError("Set Not Found", 404);

            await cardModel.deleteMany({ Set: set._id }).session(session);
            await setModel.deleteOne({ _id: set._id }).session(session);
        });

        session.endSession();
        return res.status(200).json({ message: "Set and its cards deleted." });
    } catch (error) {
        session.endSession();
        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};


export const getSet = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { ID, Name } = req.query;

        let foundSet;

        await session.withTransaction(async () => {
            if (ID) {
                foundSet = await setModel.findById(ID).populate('cards').session(session);
            } else if (Name) {
                foundSet = await setModel.findOne({Name: Name }).populate('cards').session(session);
            } else {
                throw new DBError("No ID or Name provided to search for set", 400);
            }

            if (!foundSet) throw new DBError("Set Not Found", 404);
        });

        session.endSession();

        const cardResponses = foundSet.cards.map(card => ({
            ...card.toObject(),
            Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
        }));

        return res.status(200).json({
            setId: foundSet._id,
            Name: foundSet.Name,
            SetNo: foundSet.SetNo,
            count: foundSet.cards.length,
            cards: cardResponses
        });

    } catch (error) {
        session.endSession();
        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

export const getAllSets = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const sets = await session.withTransaction(async () => {
            const allSets = await setModel.find({}).populate('cards').session(session);
            return allSets;
        });

        session.endSession();

        const setsResponse = sets.map(set => {
            const cards = set.cards.map(card => ({
                ...card.toObject(),
                Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
            }));

            return {
                setId: set._id,
                Name: set.Name,
                SetNo: set.SetNo,
                count: set.cards.length,
                cards: cards
            };
        });

        return res.status(200).json(setsResponse);

    } catch (error) {
        session.endSession();
        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

/*
Expects 
- ID 
- Name (Optional)
- SetNo (Optional)
*/ 
export const editSet = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const body = req.body;

            if (!body.ID) throw new DBError("No Set ID given!", 404);

            const set = await setModel.findById(body.ID).session(session);
            if (!set){
                set = await setModel.findOne({ SetNo: body.prevSetNo }).session(session);
                if(!set) throw new DBError("Set Not Found", 404);
            }

            if (body.Name && body.Name !== set.Name) {
                const existingByName = await setModel.findOne({
                    _id: { $ne: set._id },
                    Name: body.Name
                }).session(session);
                if (existingByName) {
                    throw new DBError("A set with this Name already exists.", 400);
                }
                set.Name = body.Name;
            }

            if (body.SetNo && body.SetNo !== set.SetNo) {
                const existingBySetNo = await setModel.findOne({
                    _id: { $ne: set._id },
                    SetNo: body.SetNo
                }).session(session);
                if (existingBySetNo) {
                    throw new DBError("A set with this Set Number already exists.", 400);
                }
                set.SetNo = body.SetNo;
            }

            await set.save({ session });
        });

        session.endSession();
        return res.status(200).json({ setID: req.body.ID, message: "Set successfully edited" });

    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) { 
            code = 400;
            if (error.keyPattern?.SetNo) {
                message = "A set with this Set Number already exists.";
            } else if (error.keyPattern?.Name) {
                message = "A set with this Name already exists.";
            } else {
                message = "Duplicate field value entered.";
            }
        }

        return res.status(code).json({ message });
    }
};


export const getAllCardsNotInSet = async(req, res) => { 
    const session = await mongoose.startSession(); 
    try{
        const cards = await session.withTransaction(async () => {
            const allCards = await cardModel.find({
                                    $or: [
                                        { Set: { $exists: false } },
                                        { Set: null }
                                    ]
                                    }).session(session)
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
