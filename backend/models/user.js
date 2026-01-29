import mongoose, {Document, Schema} from 'mongoose'; 

const userSchema = new Schema({
    Username: {type: String, required: true, unique: true },
    DiscordID: {type: String, required: true, unique: true },
    Pin: {type: String, required: true},
    isAdmin: { type: Boolean, default: false },
    packsAvailable: {type: Number, default: 1}, //This ensures they have one on joining
    Cards: [{
        card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
        quantity: { type: Number, default: 1 }
    }],
    UltraRarePity: {type: Number, default: 0},
    //Trades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: [] }],
})

const userModel = mongoose.models.User || mongoose.model('User', userSchema)

export default userModel
