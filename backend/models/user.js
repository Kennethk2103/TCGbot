import mongoose, {Document, Schema} from 'mongoose'; 

const userSchema = new Schema({
    Username: {type: String, required: true },
    DiscordID: {type: String, required: true },
    Pin: {type: String, required: true},
    isAdmin: { type: Boolean, default: false },
    Cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }],
})

const userModel = mongoose.models.Set || mongoose.model('User', userSchema)

export default userModel