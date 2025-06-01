const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    prepTime: { type: String, trim: true }, // e.g., "2 horas", "30 minutos"
    yield: { type: String, trim: true }, // e.g., "1 panela grande", "8 porções"
    ingredients: [{ type: String, required: true, trim: true }],
    instructions: [{ type: String, required: true, trim: true }],
    images: [{ type: String }], // URLs or paths to images
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    isApproved: { type: Boolean, default: true } // For admin moderation
}, { timestamps: true });

// Index for searching by title and category
recipeSchema.index({ title: "text", description: "text" });
recipeSchema.index({ category: 1 });
recipeSchema.index({ author: 1 });

module.exports = mongoose.model("Recipe", recipeSchema);

