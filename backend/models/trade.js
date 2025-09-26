import mongoose, {Document, Schema} from 'mongoose'; 

const tradeSchema = new Schema({
    Sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Reciever: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    CardsOffered: [{
        card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    CardsRequested: [{
        card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    Completed: { type: Boolean, default: false },
    Rejected: { type: Boolean, default: false },
})

const tradeModel = mongoose.models.Set || mongoose.model('Trade', tradeSchema)

export default tradeModel