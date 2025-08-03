import mongoose, {Document, Schema} from 'mongoose'; 

const cardSchema = new Schema({
    Name: {type: String, required: true },
    Subtitle: {type: String, required: true }, 
    Rarity: {type: String, enum:['Common', 'Rare', 'Ultra Rare'], required: true }, 
    Set: { type: mongoose.Schema.Types.ObjectId, ref: 'Set'},
    Num: { type: Number, required: true },
    Artwork: {
        data: Buffer, 
        contentType: {
            type: String,
            enum: ['image/png', 'image/jpeg', 'image/gif'],
            required: true
        } 
    },
})

const cardModel = mongoose.models.Card || mongoose.model('Card', cardSchema)

export default cardModel