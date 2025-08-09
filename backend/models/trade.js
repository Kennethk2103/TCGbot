import mongoose, {Document, Schema} from 'mongoose'; 

const tradeSchema = new Schema({
    Sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Reciever: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    CardsOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true }],
    CardsRequested: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true }],
    Completed: {type: Boolean, default: false}, 
})

const tradeModel = mongoose.models.Set || mongoose.model('Trade', tradeSchema)

export default tradeModel

//Create Trade 
//View Trade
//Reject (Delete Trade)
//Accept (Move cards)
//Edit 
//Get all trades for a user? 