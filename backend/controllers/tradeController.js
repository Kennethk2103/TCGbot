import cardModel from '../models/card.js'
import tradeModel from '../models/trade.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';
import userModel from '../models/user.js';

//Create Trade 
// Expects req.body to have: offeringUserDiscordID (string), receivingUserDiscordID (string),
// offeredCards (array of { card: ObjectId, quantity: number }), requestedCards (array of { card: ObjectId, quantity: number })
export const addTrade = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const savedTrade = await session.withTransaction(async () => {
            const body = req.body;

            if (!body.offeringUserDiscordID) throw new DBError("No offering user's DiscordID provided", 404);
            if (!body.receivingUserDiscordID) throw new DBError("No receiving user's DiscordID provided", 404);
            if (!body.offeredCards || !Array.isArray(body.offeredCards) || body.offeredCards.length === 0)
                throw new DBError("No offered cards provided", 404);
            if (!body.requestedCards || !Array.isArray(body.requestedCards) || body.requestedCards.length === 0)
                throw new DBError("No requested cards provided", 404);

            const offeringUser = await userModel.findOne({ DiscordID: body.offeringUserDiscordID }).session(session);
            if (!offeringUser) throw new DBError("Offering user not found", 404);

            const receivingUser = await userModel.findOne({ DiscordID: body.receivingUserDiscordID }).session(session);
            if (!receivingUser) throw new DBError("Receiving user not found", 404);

            // Ensure offeredCards/requestedCards are in { card: ObjectId, quantity: Number } format
            function normalizeCards(cards) {
                return cards.map(c => ({
                    card: mongoose.Types.ObjectId(c.card),
                    quantity: typeof c.quantity === 'number' && c.quantity > 0 ? c.quantity : 1
                }));
            }

            const offeredCards = normalizeCards(body.offeredCards);
            const requestedCards = normalizeCards(body.requestedCards);

            const trade = new tradeModel({
                offeringUser: offeringUser._id,
                receivingUser: receivingUser._id,
                offeredCards,
                requestedCards,
                status: 'pending'
            });

            const savedTrade = await trade.save({ session });

            if (!savedTrade) throw new DBError("Failed to create new trade", 500);

            return savedTrade;
        });

        session.endSession();
        return res.status(200).json({ tradeID: savedTrade._id, message: "Trade successfully created" });
    } catch (error) {
        session.endSession();

        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        } else if (error.code === 11000) {
            code = 400;
            message = "Duplicate field value entered.";
        }

        return res.status(code).json({ message });
    }
};


//View Trade
// Expects req.params to have: id (trade ID)
export const getTrade = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const trade = await session.withTransaction(async () => {
            const tradeID = req.params.id;
            if (!tradeID) throw new DBError("No trade ID provided", 404);

            const trade = await tradeModel.findById(tradeID)
                .populate('offeringUser', 'DiscordID username')
                .populate('receivingUser', 'DiscordID username')
                .populate('offeredCards')
                .populate('requestedCards')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            return trade;
        });

        session.endSession();
        return res.status(200).json(trade);
    } catch (error) {
        session.endSession();
        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        }

        return res.status(code).json({ message });
    }
};

// Reject (Delete Trade)
// Expects req.body to have: callingUser (DiscordID of the user performing the rejection)
export const rejectTrade = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const deletedTrade = await session.withTransaction(async () => {
            const tradeID = req.params.id;
            const callingUserDiscordID = req.body.callingUser;

            if (!tradeID) throw new DBError("No trade ID provided", 404);
            if (!callingUserDiscordID) throw new DBError("No calling user DiscordID provided", 404);

            const trade = await tradeModel.findById(tradeID)
                .populate('offeringUser', 'DiscordID username role')
                .populate('receivingUser', 'DiscordID username role')
                .populate('offeredCards')
                .populate('requestedCards')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            // Find calling user
            const callingUser = await userModel.findOne({ DiscordID: callingUserDiscordID }).session(session);
            if (!callingUser) throw new DBError("Calling user not found", 404);

            // Check permissions
            const isOfferingUser = trade.offeringUser.DiscordID === callingUserDiscordID;
            const isReceivingUser = trade.receivingUser.DiscordID === callingUserDiscordID;
            const isAdmin = callingUser.role === 'admin';

            if (!isOfferingUser && !isReceivingUser && !isAdmin) {
                throw new DBError("User not authorized to reject this trade", 403);
            }

            // Delete trade
            const deleted = await tradeModel.findByIdAndDelete(tradeID).session(session);
            if (!deleted) throw new DBError("Failed to delete trade", 500);

            return trade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade rejected and deleted", trade: deletedTrade });
    } catch (error) {
        session.endSession();
        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        }

        return res.status(code).json({ message });
    }
};


// Accept Trade
// Expects req.body to have: callingUser (DiscordID of the user attempting to accept the trade)
export const acceptTrade = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const acceptedTrade = await session.withTransaction(async () => {
            const tradeID = req.params.id;
            const callingUserDiscordID = req.body.callingUser;

            if (!tradeID) throw new DBError("No trade ID provided", 404);
            if (!callingUserDiscordID) throw new DBError("No calling user DiscordID provided", 404);

            const trade = await tradeModel.findById(tradeID)
                .populate('offeringUser', 'DiscordID username role cards')
                .populate('receivingUser', 'DiscordID username role cards')
                .populate('offeredCards')
                .populate('requestedCards')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            // Find calling user
            const callingUser = await userModel.findOne({ DiscordID: callingUserDiscordID }).session(session);
            if (!callingUser) throw new DBError("Calling user not found", 404);

            // Check permissions
            const isOfferingUser = trade.offeringUser.DiscordID === callingUserDiscordID;
            const isReceivingUser = trade.receivingUser.DiscordID === callingUserDiscordID;
            const isAdmin = callingUser.role === 'admin';

            if (!isOfferingUser && !isReceivingUser && !isAdmin) {
                throw new DBError("User not authorized to accept this trade", 403);
            }

            // Check both users have the cards they are offering
            function hasCards(userCards, offeredCards) {
                const cardCount = {};
                userCards.forEach(c => {
                    cardCount[c.card.toString()] = (cardCount[c.card.toString()] || 0) + c.quantity;
                });
                for (const offered of offeredCards) {
                    const cardId = offered.card ? offered.card.toString() : offered.toString();
                    const qty = offered.quantity || 1;
                    if (!cardCount[cardId] || cardCount[cardId] < qty) {
                        return false;
                    }
                    cardCount[cardId] -= qty;
                }
                return true;
            }

            const offeringUserHasCards = hasCards(trade.offeringUser.cards, trade.offeredCards);
            const receivingUserHasCards = hasCards(trade.receivingUser.cards, trade.requestedCards);

            if (!offeringUserHasCards) throw new DBError("Offering user does not have all offered cards", 400);
            if (!receivingUserHasCards) throw new DBError("Receiving user does not have all requested cards", 400);

            // Move cards from offeringUser to receivingUser
            async function moveCards(fromUserId, toUserId, cards) {
                for (const card of cards) {
                    const cardId = card.card ? card.card : card;
                    const qty = card.quantity || 1;
                    // Remove from fromUser
                    await userModel.updateOne(
                        { _id: fromUserId, "cards.card": cardId },
                        { $inc: { "cards.$.quantity": -qty } }
                    ).session(session);
                    // Add to toUser
                    const toUser = await userModel.findOne({ _id: toUserId, "cards.card": cardId }).session(session);
                    if (toUser) {
                        await userModel.updateOne(
                            { _id: toUserId, "cards.card": cardId },
                            { $inc: { "cards.$.quantity": qty } }
                        ).session(session);
                    } else {
                        await userModel.updateOne(
                            { _id: toUserId },
                            { $push: { cards: { card: cardId, quantity: qty } } }
                        ).session(session);
                    }
                }
            }

            await moveCards(trade.offeringUser._id, trade.receivingUser._id, trade.offeredCards);
            await moveCards(trade.receivingUser._id, trade.offeringUser._id, trade.requestedCards);

            // Delete trade from DB after completion
            await tradeModel.findByIdAndDelete(tradeID).session(session);

            // Return the accepted trade (before deletion)
            return trade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade accepted", trade: acceptedTrade });
    } catch (error) {
        session.endSession();
        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        }

        return res.status(code).json({ message });
    }
};

//Edit
// Expects req.body to have: callingUser (DiscordID), offeredCards (array), requestedCards (array)
export const editTrade = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const updatedTrade = await session.withTransaction(async () => {
            const tradeID = req.params.id;
            const callingUserDiscordID = req.body.callingUser;
            const { offeredCards, requestedCards } = req.body;

            if (!tradeID) throw new DBError("No trade ID provided", 404);
            if (!callingUserDiscordID) throw new DBError("No calling user DiscordID provided", 404);
            if (!offeredCards || !Array.isArray(offeredCards) || offeredCards.length === 0)
                throw new DBError("No offered cards provided", 404);
            if (!requestedCards || !Array.isArray(requestedCards) || requestedCards.length === 0)
                throw new DBError("No requested cards provided", 404);

            const trade = await tradeModel.findById(tradeID)
                .populate('offeringUser', 'DiscordID')
                .populate('receivingUser', 'DiscordID')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            const isOfferingUser = trade.offeringUser.DiscordID === callingUserDiscordID;
            const isReceivingUser = trade.receivingUser.DiscordID === callingUserDiscordID;

            if (!isOfferingUser && !isReceivingUser) {
                throw new DBError("User not authorized to edit this trade", 403);
            }

            function normalizeCards(cards) {
                return cards.map(c => ({
                    card: mongoose.Types.ObjectId(c.card),
                    quantity: typeof c.quantity === 'number' && c.quantity > 0 ? c.quantity : 1
                }));
            }

            const normalizedOfferedCards = normalizeCards(offeredCards);
            const normalizedRequestedCards = normalizeCards(requestedCards);

            trade.offeredCards = normalizedOfferedCards;
            trade.requestedCards = normalizedRequestedCards;

            const savedTrade = await trade.save({ session });
            if (!savedTrade) throw new DBError("Failed to update trade", 500);

            return savedTrade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade updated", trade: updatedTrade });
    } catch (error) {
        session.endSession();
        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        }

        return res.status(code).json({ message });
    }
};

// Expects req.params to have: discordID (string)
export const getUserTrades = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const trades = await session.withTransaction(async () => {
            const discordID = req.params.discordID;
            if (!discordID) throw new DBError("No DiscordID provided", 404);

            const user = await userModel.findOne({ DiscordID: discordID }).session(session);
            if (!user) throw new DBError("User not found", 404);

            const userTrades = await tradeModel.find({
                $or: [
                    { offeringUser: user._id },
                    { receivingUser: user._id }
                ]
            })
            .populate('offeringUser', 'DiscordID username')
            .populate('receivingUser', 'DiscordID username')
            .populate('offeredCards')
            .populate('requestedCards')
            .session(session);

            return userTrades;
        });

        session.endSession();
        return res.status(200).json(trades);
    } catch (error) {
        session.endSession();
        let code = 500;
        let message = error.message;

        if (error instanceof DBError) {
            code = error.statusCode;
        }

        return res.status(code).json({ message });
    }
};


