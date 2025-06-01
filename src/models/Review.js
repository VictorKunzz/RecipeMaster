const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true }
}, { timestamps: true });

// Index for faster lookups by recipe and author
reviewSchema.index({ recipe: 1 });
reviewSchema.index({ author: 1 });

// Middleware to update the average rating on the Recipe model after saving a review
reviewSchema.post("save", async function(doc) {
    try {
        const Recipe = mongoose.model("Recipe");
        const stats = await mongoose.model("Review").aggregate([
            { $match: { recipe: doc.recipe } },
            { $group: { _id: "$recipe", averageRating: { $avg: "$rating" } } }
        ]);
        if (stats.length > 0) {
            await Recipe.findByIdAndUpdate(doc.recipe, { averageRating: stats[0].averageRating });
        } else {
            await Recipe.findByIdAndUpdate(doc.recipe, { averageRating: 0 }); // Reset if no reviews
        }
    } catch (error) {
        console.error("Error updating average rating:", error);
    }
});

// Middleware to update the average rating on the Recipe model after removing a review
reviewSchema.post("remove", async function(doc) {
    try {
        const Recipe = mongoose.model("Recipe");
        const stats = await mongoose.model("Review").aggregate([
            { $match: { recipe: doc.recipe } },
            { $group: { _id: "$recipe", averageRating: { $avg: "$rating" } } }
        ]);
        if (stats.length > 0) {
            await Recipe.findByIdAndUpdate(doc.recipe, { averageRating: stats[0].averageRating });
        } else {
            await Recipe.findByIdAndUpdate(doc.recipe, { averageRating: 0 }); // Reset if no reviews
        }
    } catch (error) {
        console.error("Error updating average rating after removal:", error);
    }
});

module.exports = mongoose.model("Review", reviewSchema);

