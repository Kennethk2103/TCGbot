import mongoose, {Document, Schema} from 'mongoose'; 

const userSchema = new Schema({
    Username: {type: String, required: true },
    DiscordID: {type: String, required: true },
    Pin: {type: String, required: true},
    isAdmin: { type: Boolean, default: false },
    packsAvailable: {type: Number, default: 1}, //This ensures they have one on joining
    Cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }],
    Trades: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trade', default: [] }],
    Cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: [] }]
})

const userModel = mongoose.models.User || mongoose.model('User', userSchema)

export default userModel

//View user cards 
//View User Info 
//Sign Up (add User)
//Edit info 
//Add card (Internal)
//Remove Card (Internal)
//Open Pack 
//Delete User 
//Get all trades 