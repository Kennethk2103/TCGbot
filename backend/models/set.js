import mongoose, {Document, Schema} from 'mongoose'; 

const setSchema = new Schema({
    Name: {type: String, required: true },
    cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }],
})

const setModel = mongoose.models.Set || mongoose.model('Set', setSchema)

export default setModel