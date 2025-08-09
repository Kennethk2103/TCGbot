import cardModel from '../models/card.js'
import setModel from '../models/set.js'
import userModel from '../models/user.js';
import tradeModel from '../models/trade.js';
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';

/*
Expects: Username, DiscordID, Pin
*/
export const addUser = async(req, res) => {
    const session = await mongoose.startSession();
    try{
        const savedUser = await session.withTransaction(async () => {
            const body = req.body;

            if(!body.Username) throw new DBError("No Username Was Given", 404)
            if(!body.DiscordID) throw new DBError("No Discord ID Was Gicen", 404)
            if(!body.Pin) throw new DBError("No Pin Was Given", 404)
            
            let user = new userModel({
                Username: body.Username,
                DiscordID: body.DiscordID,
                Pin: body.Pin,
            })
            const savedUser = await user.save({session})

            if(!savedUser){
                throw new DBError("Failed to create new user", 500)
            }

            return savedUser
        })

        session.endSession();
        return res.status(200).json({ userID: savedUser._id, message: "User successfully created" });

    }catch(error){
        session.endSession();
        let code = 500;
        if(error instanceof DBError) 
        {
            code = error.statusCode;
        }  
        return res.status(code).json({ message: error.message });        
    }
}

/*
Expects: DiscordID or UserID, TorF (true or false EXACTLY)
*/
export const setAdmin = async(req, res) => {
    const session = await mongoose.startSession();
    try {
        const adminified = await session.withTransaction(async () => {
            const body = req.body; 

            if(!body.DiscordID && !body.UserID) throw new DBError("No User ID or Discord ID given", 404);
            if(!body.TorF || (body.TorF != "true" && body.TorF !="false")) throw new DBError("No Boolean given.  Expected true or false", 404);

            var bo = false; 
            if(body.TorF == "true") bo = true;
            
            var user; 

            if(body.DiscordID){
                user = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }
            //In case somehow a username and DiscordID were sent, don't use the Username
            if(!user && body.UserID){
                user = await userModel.findById(userID).session(session);
            }

            if(!user){
                throw new DBError("User was not found!")
            }

            user.isAdmin = bo; 

            await user.save({session})

            return user
        })

        session.endSession();

        var msg = `${adminified.Username} successfully Made admin`
        if(adminified.isAdmin == false){
            msg = `${adminified.Username} was revoked admin status`
        }
        return res.status(200).json({ userID: adminified._id, message: msg });
    }catch(error){
        session.endSession();

        const code = error instanceof DBError ? error.statusCode : 500;
        return res.status(code).json({ message: error.message });        
    }
}

/*
expects the cardID and userID
*/
async function internalGiveCardToUser(cardID, userID, session){
    try{
        const card = await cardModel.findById(cardID).session(session);
        const user = await userModel.findById(userID).session(session);
        if (!card) throw new DBError("Card Not Found", 404);
        if (!user) throw new DBError("User Not Found", 404);

        await userModel.updateOne(
            { _id: userID },
            { $push: { Cards: cardID } },
            { session }
        );
    }catch (error) {
        throw error;
    }
}

async function internalTakeCardFromUser(cardID, userID, session){
    try{
        const user = await userModel.findById(userID).session(session);
        const card = await cardModel.findById(cardID).session(session);
        if (!card) throw new DBError("Card Not Found", 404);
        if (!user) throw new DBError("User Not Found", 404);

        const cardIndex = user.Cards.findIndex(c => c.toString() === cardID.toString());

        if (cardIndex === -1) {
            throw new DBError("User does not have this card", 400);
        }
        
        user.Cards.splice(cardIndex, 1);
        await user.save({ session });
    }catch{
        throw error; 
    }
}

/*
expects the cardID and userID or DiscordID
*/
export const giveUserCard = async (req, res) => {
    const session = await mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            const body = req.body;
            if (!body.cardID) throw new DBError("No cardID provided", 400);  
            if(!body.DiscordID && !body.UserID) throw new DBError("No User ID or Discord ID given", 404);

            var user; 
            if(body.DiscordID){
                user = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }
    
            if(!user && body.UserID){
                user = await userModel.findById(body.UserID).session(session);
            }
            
            await internalGiveCardToUser(body.cardID, user._id, session)
        })
        session.endSession();
        return res.status(200).json({ message: "Card given to user." });
    }catch (error) {
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });
    }
}

/*
Expects the cardID and userID or DiscordID
*/ 
export const removeUserCard = async (req, res) => { 
    const session = await mongoose.startSession();
    try{
        await session.withTransaction(async () => {
            const body = req.body;
            if (!body.cardID) throw new DBError("No cardID provided", 400);  
            if(!body.DiscordID && !body.UserID) throw new DBError("No User ID or Discord ID given", 404);

            var user; 
            if(body.DiscordID){
                user = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }
    
            if(!user && body.UserID){
                user = await userModel.findById(body.UserID).session(session);
            }
            
            await internalTakeCardFromUser(body.cardID, user._id, session)
        })
        session.endSession();
        return res.status(200).json({ message: "Card taken from user." });
    }catch (error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });        
    }
}

/*
Expects Username, DiscordID, or ID
*/ 
export const getUser = async (req, res) => { 
    const session = await mongoose.startSession();
    try{
        const { Username, DiscordID, ID } = req.query;
        let foundUser;
        await session.withTransaction(async () => {
            if(ID){
                foundUser = await userModel.findById(ID).session(session)
            }
            if(!foundUser && Username){
                foundUser = await userModel.findOne({Username: Username }).session(session)
            } 

            if(!foundUser && DiscordID){
                foundUser = await userModel.findOne({DiscordID: DiscordID}).session(session)
            }

            if(!foundUser){
                throw new DBError("No User was found.  Please make sure you provided a Username, DiscordID, or ID", 400);
            }
        });

        session.endSession();

        return res.status(200).json({
            UserId: foundUser._id,
            Username: foundUser.Username,
            DiscordID: foundUser.DiscordID,
            isAdmin: foundUser.isAdmin,
            packsAvailable: foundUser.packsAvailable,
        });

    }catch (error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });          
    }
}

/*
Expects Username, DiscordID, or ID
*/ 
export const getUserCards = async(req, res) => {
    const session = await mongoose.startSession();
    const { Username, DiscordID, ID } = req.query;
    let foundUser;
    try{
        await session.withTransaction(async () => {
            if(ID){
                foundUser = await userModel.findById(ID).populate('Cards').session(session)
            }
            if(!foundUser && Username){
                foundUser = await userModel.findOne({Username: Username }).populate('Cards').session(session)
            } 

            if(!foundUser && DiscordID){
                foundUser = await userModel.findOne({DiscordID: DiscordID}).populate('Cards').session(session)
            }

            if(!foundUser){
                throw new DBError("No User was found.  Please make sure you provided a Username, DiscordID, or ID", 400);
            }
        })

        session.endSession();

        const cardResponses = foundUser.Cards.map(card => ({
            ...card.toObject(),
            Artwork: `data:${card.Artwork.contentType};base64,${card.Artwork.data.toString('base64')}`
        }));   

            return res.status(200).json({
                NumCards: cardResponses.length,
                UserId: foundUser._id,
                cards: cardResponses
        });
    }catch (error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });               
    }
} 

async function internalEditUser(userID, Pin, packsAvailable, session){
    try{
        const user = await userModel.findById(userID).session(session);
        if (!user) throw new DBError("User Not Found", 404);
        
        if(packsAvailable !== undefined) user.packsAvailable = packsAvailable
        if(Pin !== undefined) user.Pin = Pin

        await user.save({ session  });        
        return user; 
    }catch (error) {
        throw error;
    }

}

/*
Expects UserID, DiscordID, or Username 

Editable: packsAvailable or Pin   
*/
export const editUserInfo = async(req, res) => {
    const session = await mongoose.startSession();
    const body = req.body;
    try{
        const foundUser = await session.withTransaction(async () => {
            var foundUser; 
            if(body.ID){
                foundUser = await userModel.findById(body.UserID).session(session)
            }
            if(!foundUser && body.Username){
                foundUser = await userModel.findOne({Username: body.Username }).session(session)
            } 

            if(!foundUser && body.DiscordID){
                foundUser = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }

            if(!foundUser){
                throw new DBError("No User was found.  Please make sure you provided a Username, DiscordID, or ID", 400);
            }

            return await internalEditUser(foundUser._id, body.Pin, body.packsAvailable, session)
        })

        session.endSession();
        return res.status(200).json({ Username: foundUser.Username, message: "User successfully edited" });
    }catch(error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });          
    }
}

/*
Expects UserID, DiscordID, or Username 
setID (you choose which set the card pool will contain).  If not provided you will pull from any set? 
*/
export const openPack = async(req, res) => {
    const session = await mongoose.startSession();
    const body = req.body;

    try{
        var foundUser; 
        const recieved = await session.withTransaction(async () => {
            if(body.UserID){
                foundUser = await userModel.findById(body.UserID).session(session)
            }
            if(!foundUser && body.Username){
                foundUser = await userModel.findOne({Username: body.Username }).session(session)
            } 

            if(!foundUser && body.DiscordID){
                foundUser = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }

            if(!foundUser){
                throw new DBError("No User was found.  Please make sure you provided a Username, DiscordID, or ID", 400);
            }    

            if(foundUser.packsAvailable <= 0 ) throw new DBError("User has no packs to open!")

            let setId
            if(body.setID){
                const matchset = await setModel.findOne({_id: body.setID}).session(session)
                if(!matchset){
                    throw new DBError("Given set was not found",404)
                }
                setId = matchset._id
            }
            
            const card1 = await cardModel.aggregate([
                {
                    $match: {
                        Rarity: "Common",
                        ...(setId ? { Set: setId } : {})  
                    }
                },
                { $sample: { size: 1 } }
            ]).session(session);;      
            
            const card2 = await cardModel.aggregate([
                {
                    $match: {
                        Rarity: { $in: ["Common", "Rare"] },
                        ...(setId ? { Set: setId } : {})  
                    }
                },
                { $sample: { size: 1 } }
            ]).session(session);;  

            const card3 = await cardModel.aggregate([
                {
                    $match: {
                        ...(setId ? { Set: setId } : {})  
                    }
                },
                { $sample: { size: 1 } }
            ]).session(session);

            if (!card1.length || !card2.length || !card3.length) {
                throw new DBError("A card could not be given for some reason!", 404);
            }

            const card1Doc = card1[0];
            const card2Doc = card2[0];
            const card3Doc = card3[0];

            await internalGiveCardToUser(card1Doc._id, foundUser._id, session)
            await internalGiveCardToUser(card2Doc._id, foundUser._id, session)
            await internalGiveCardToUser(card3Doc._id, foundUser._id, session)

            await internalEditUser(foundUser._id, undefined, foundUser.packsAvailable-1, session)
            
            return [card1Doc, card2Doc, card3Doc]
        })
        session.endSession();
        return res.status(200).json({ message: `${foundUser.Username} opened a pack!`, cards: recieved.map(c => c._id) });

    }catch(error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });            
    }
}

export const deleteUser = async(req, res) => { 
    const session = await mongoose.startSession();
    const body = req.body;

    try{
        const recieved = await session.withTransaction(async () => {
            if(body.UserID){
                foundUser = await userModel.findById(body.UserID).session(session)
            }
            if(!foundUser && body.Username){
                foundUser = await userModel.findOne({Username: body.Username }).session(session)
            } 

            if(!foundUser && body.DiscordID){
                foundUser = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }

            if(!foundUser){
                throw new DBError("No User was found.  Please make sure you provided a Username, DiscordID, or ID", 400);
            }    

            await userModel.findByIdAndDelete(foundUser._id).session(session)
        })
        session.endSession();
        return res.status(200).json({ message: "User deleted." });
    }catch(error){
        const code = error instanceof DBError ? error.statusCode : 500;
        session.endSession();
        return res.status(code).json({ message: error.message });  
    }
}
