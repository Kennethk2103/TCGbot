import mongoose, {Document, Schema} from 'mongoose'; 

const cardSchema = new Schema({
    Name: { type: String, required: true },
    Subtitle: { type: String, required: true }, 
    Rarity: { type: String, enum: ['Common', 'Rare', 'Ultra Rare'], required: true }, 
    Set: { type: mongoose.Schema.Types.ObjectId, ref: 'Set' },
    Num: { type: Number, required: true },
    Artist: { type: String, required: true },
    Artwork: {
        data: String, 
        contentType: {
            type: String,
            enum: ['image/png', 'image/jpeg', 'image/gif'],
            required: true
        } 
    },
    Backside: {
        data: String,
        contentType: {
            type: String,
            enum: ['image/png', 'image/jpeg', 'image/gif'],
            required: true
        }
    },
    Bio: { type: String, required: true },
    Power: { type: Number, min: 0, max: 5, required: true },
    Speed: { type: Number, min: 0, max: 5, required: true },
    Special: { type: Number, min: 0, max: 5, required: true },
    SearchID: { type: String, required: true },
});

cardSchema.index(
    { Set: 1, Num: 1 },
    { unique: true, partialFilterExpression: { Set: { $type: 'objectId' } } }
);

const cardModel = mongoose.models.Card || mongoose.model('Card', cardSchema)

export default cardModel