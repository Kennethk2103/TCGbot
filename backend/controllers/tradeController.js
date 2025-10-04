import tradeModel from '../models/trade.js';
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';
import userModel from '../models/user.js';

// Normalize cards into { card: ObjectId, quantity }
function normalizeCards(cards) {
    return cards.map(c => ({
        card: new mongoose.Types.ObjectId(c.card),
        quantity: typeof c.quantity === 'number' && c.quantity > 0 ? c.quantity : 1
    }));
}

// Create Trade
// Expects req.body to have: offeringUserDiscordID, receivingUserDiscordID, offeredCards, requestedCards
export const addTrade = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const savedTrade = await session.withTransaction(async () => {
            const { offeringUserDiscordID, receivingUserDiscordID, offeredCards, requestedCards } = req.body;

            if (!offeringUserDiscordID) throw new DBError("No offering user's DiscordID provided", 404);
            if (!receivingUserDiscordID) throw new DBError("No receiving user's DiscordID provided", 404);
            if (!offeredCards || !Array.isArray(offeredCards)) throw new DBError("No offered cards provided", 404);
            if (!requestedCards || !Array.isArray(requestedCards)) throw new DBError("No requested cards provided", 404);

            const offeringUser = await userModel.findOne({ DiscordID: offeringUserDiscordID }).session(session);
            if (!offeringUser) throw new DBError("Offering user not found", 404);

            const receivingUser = await userModel.findOne({ DiscordID: receivingUserDiscordID }).session(session);
            if (!receivingUser) throw new DBError("Receiving user not found", 404);

            const trade = new tradeModel({
                offeringUser: offeringUser._id,
                receivingUser: receivingUser._id,
                offeredCards: normalizeCards(offeredCards),
                requestedCards: normalizeCards(requestedCards),
                completed: false,
                rejected: false
            });

            const savedTrade = await trade.save({ session });
            if (!savedTrade) throw new DBError("Failed to create new trade", 500);

            return savedTrade;
        });

        session.endSession();
        return res.status(200).json({ tradeID: savedTrade._id, message: "Trade successfully created" });
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        let message = error.code === 11000 ? "Duplicate field value entered." : error.message;
        return res.status(code).json({ message });
    }
};

// View Trade
export const getTrade = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const trade = await session.withTransaction(async () => {
            const tradeID = req.params.id;
            if (!tradeID) throw new DBError("No trade ID provided", 404);

            const trade = await tradeModel.findById(tradeID)
                .populate('offeringUser', 'DiscordID username')
                .populate('receivingUser', 'DiscordID username')
                .populate('offeredCards.card')
                .populate('requestedCards.card')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);
            return trade;
        });

        session.endSession();
        return res.status(200).json(trade);
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

// Reject Trade
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
                .populate('offeredCards.card')
                .populate('requestedCards.card')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            const callingUser = await userModel.findOne({ DiscordID: callingUserDiscordID }).session(session);
            if (!callingUser) throw new DBError("Calling user not found", 404);

            const isOfferingUser = trade.offeringUser.DiscordID === callingUserDiscordID;
            const isReceivingUser = trade.receivingUser.DiscordID === callingUserDiscordID;
            const isAdmin = callingUser.role === 'admin';

            if (!isOfferingUser && !isReceivingUser && !isAdmin) {
                throw new DBError("User not authorized to reject this trade", 403);
            }

            const deleted = await tradeModel.findByIdAndDelete(tradeID).session(session);
            if (!deleted) throw new DBError("Failed to delete trade", 500);

            return trade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade rejected and deleted", trade: deletedTrade });
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

// Accept Trade
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
                .populate('offeredCards.card')
                .populate('requestedCards.card')
                .session(session);

            if (!trade) throw new DBError("Trade not found", 404);

            const callingUser = await userModel.findOne({ DiscordID: callingUserDiscordID }).session(session);
            if (!callingUser) throw new DBError("Calling user not found", 404);

            const isOfferingUser = trade.offeringUser.DiscordID === callingUserDiscordID;
            const isReceivingUser = trade.receivingUser.DiscordID === callingUserDiscordID;
            const isAdmin = callingUser.role === 'admin';

            if (!isOfferingUser && !isReceivingUser && !isAdmin) {
                throw new DBError("User not authorized to accept this trade", 403);
            }

            // Ensure both users own the cards they’re offering
            function hasCards(userCards, offeredCards) {
                const cardCount = {};
                userCards.forEach(c => {
                    cardCount[c.card.toString()] = (cardCount[c.card.toString()] || 0) + c.quantity;
                });
                for (const offered of offeredCards) {
                    const cardId = offered.card ? offered.card.toString() : offered.toString();
                    const qty = offered.quantity || 1;
                    if (!cardCount[cardId] || cardCount[cardId] < qty) return false;
                    cardCount[cardId] -= qty;
                }
                return true;
            }

            const offeringUserHasCards = hasCards(trade.offeringUser.cards, trade.offeredCards);
            const receivingUserHasCards = hasCards(trade.receivingUser.cards, trade.requestedCards);

            if (!offeringUserHasCards) throw new DBError("Offering user does not have all offered cards", 400);
            if (!receivingUserHasCards) throw new DBError("Receiving user does not have all requested cards", 400);

            // Move cards
            async function moveCards(fromUserId, toUserId, cards) {
                for (const card of cards) {
                    const cardId = card.card;
                    const qty = card.quantity || 1;

                    // Remove from fromUser
                    await userModel.updateOne(
                        { _id: fromUserId, "cards.card": cardId },
                        { $inc: { "cards.$.quantity": -qty } }
                    ).session(session);

                    // Add to toUser
                    const toUserHasCard = await userModel.findOne({ _id: toUserId, "cards.card": cardId }).session(session);
                    if (toUserHasCard) {
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

            await tradeModel.findByIdAndDelete(tradeID).session(session);

            return trade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade accepted", trade: acceptedTrade });
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

// Edit Trade
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

            trade.offeredCards = normalizeCards(offeredCards);
            trade.requestedCards = normalizeCards(requestedCards);

            const savedTrade = await trade.save({ session });
            if (!savedTrade) throw new DBError("Failed to update trade", 500);

            return savedTrade;
        });

        session.endSession();
        return res.status(200).json({ message: "Trade updated", trade: updatedTrade });
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};

// Get all trades for a user
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
            .populate('offeredCards.card')
            .populate('requestedCards.card')
            .session(session);

            return userTrades;
        });

        session.endSession();
        return res.status(200).json(trades);
    } catch (error) {
        session.endSession();
        let code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });
    }
};
