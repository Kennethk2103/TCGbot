import cardModel from '../models/card.js'
import setModel from '../models/set.js'
import userModel from '../models/user.js';
import tradeModel from '../models/trade.js';
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';

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

//View user cards 
//View User Info 
//Sign Up (add User)
//Toggle admin
//Edit info 
//Add card (Internal)
//Remove Card (Internal)
//Open Pack 
//Delete User 
//Get all trades 