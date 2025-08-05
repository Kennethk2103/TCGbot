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
Expects: DiscordID or Username, TorF (true or false EXACTLY)
*/
export const setAdmin = async(req, res) => {
    const session = await mongoose.startSession();
    try {
        const adminified = await session.withTransaction(async () => {
            const body = req.body; 

            if(!body.DiscordID && !body.Username) throw new DBError("No Username or Discord ID given", 404);
            if(!body.TorF || (body.TorF != "true" && body.TorF !="false")) throw new DBError("No Boolean given.  Expected true or false", 404);

            var bo = false; 
            if(body.TorF == "true") bo = true;
            
            var user; 

            if(body.DiscordID){
                user = await userModel.findOne({DiscordID: body.DiscordID}).session(session)
            }
            //In case somehow a username and DiscordID were sent, don't use the Username
            if(!user && body.Username){
                user = await userModel.findOne({Username: body.Username}).session(session)
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

//View user cards 
//View User Info 
//Toggle admin
//Edit info 
//Add card (Internal)
//Remove Card (Internal)
//Open Pack 
//Delete User 
//Get all trades 