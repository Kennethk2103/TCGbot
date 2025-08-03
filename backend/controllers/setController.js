import setModel from '../models/set.js'
import cardModel from '../models/card.js'
import mongoose from 'mongoose';
import { DBError } from './controllerUtils.js';

//Simply expects Name
export const addEmptySet = async(req , res) => {
    const session = await mongoose.startSession();
    session.startTransaction(); 

    try{
        const body = req.body;

        if(!body.Name){
            throw new DBError("No Name Was Given",404)
        }

        if(!body.SetNo){
            throw new DBError("No Set Number Was Given",404)
        }

        const Eset = await setModel.findOne({Name: body.Name}).session(session)
        const Bset = await setModel.findOne({SetNo: body.SetNo}).session(session)

        if(Eset || Bset){
            throw new DBError("Set with this name or Set Number already exists",400)
        }

        let set = new setModel({
            Name: body.Name,
            SetNo: body.SetNo,
            cards: []
        })

        const savedSet = await set.save({session})

        if(!savedSet){
            throw new DBError("Failed to create new set", 500)
        }

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({ setId: savedSet._id, message: "Set successfully created" });
    }catch(error){
        await session.abortTransaction();
        session.endSession();

        let code = 500;

        if(error instanceof DBError) 
        {
            code = error.statusCode;
        }
        
        return res.status(code).json({ message: error.message });
    }
}

//Edit set
//List all cards in set 
//List all sets 
//List all cards not in set 
//Get set 
