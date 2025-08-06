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

//View user cards 
//View User Info 
//Toggle admin
//Edit info 
//Add card (Internal)
//Remove Card (Internal)
//Open Pack 
//Delete User 
//Get all trades 