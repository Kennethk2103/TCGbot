import mongoose, { Schema } from 'mongoose';

const tradeSchema = new Schema({
    offeringUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivingUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    offeredCards: [{
        card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    requestedCards: [{
        card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    completed: { type: Boolean, default: false },
    rejected: { type: Boolean, default: false },
}, { timestamps: true }); 

const tradeModel = mongoose.models.Trade || mongoose.model('Trade', tradeSchema);

export default tradeModel;
