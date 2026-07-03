import mongoose, {Document, Schema} from 'mongoose'; 

const artworkSchema = new Schema(
  {
    ncPath: { type: String, required: true },

    shareId: { type: String, required: true },
    shareUrl: { type: String, required: true },
    downloadUrl: { type: String, required: true },

    contentType: {
      type: String,
      enum: ["image/png", "image/jpeg", "image/gif", "image/webp"],
      required: true,
    },
    originalName: { type: String, required: true },
    size: { type: Number, min: 0, required: true },

    status: {
      type: String,
      enum: ["active", "deleted", "orphaned"],
      default: "active",
      required: true,
    },
    uploadedAt: { type: Date, default: Date.now, required: true },
    revokedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { _id: false }
);


const cardSchema = new Schema(
  {
    Name: { type: String, required: true },
    Subtitle: { type: String, required: true },
    Rarity: { type: String, enum: ["Common", "Rare", "Ultra Rare"], required: true },
    Set: { type: mongoose.Schema.Types.ObjectId, ref: "Set" },
    Num: { type: Number, required: true },

    Artwork: { type: artworkSchema, required: true },
    SearchID: { type: String, required: true },
  },
  { timestamps: true }
);

cardSchema.index(
    { Set: 1, Num: 1 },
    { unique: true, partialFilterExpression: { Set: { $type: 'objectId' } } }
);

cardSchema.index({ "Artwork.ncPath": 1 }, { unique: true });
cardSchema.index({ "Artwork.shareId": 1 }, { unique: true });
cardSchema.index({ SearchID: 1 }, { unique: true });

const cardModel = mongoose.models.Card || mongoose.model('Card', cardSchema)

export default cardModel