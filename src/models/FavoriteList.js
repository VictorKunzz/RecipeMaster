const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const favoriteListSchema = new Schema({
    name: { type: String, required: true, trim: true, default: "Meus Favoritos" }, // Default list name
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipes: [{ type: Schema.Types.ObjectId, ref: "Recipe" }]
}, { timestamps: true });

// Index for faster lookups by owner
favoriteListSchema.index({ owner: 1 });

module.exports = mongoose.model("FavoriteList", favoriteListSchema);

