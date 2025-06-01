const Review = require("../models/Review");
const Recipe = require("../models/Recipe");
const mongoose = require("mongoose");

// Middleware to set recipe ID from params for nested routes
exports.setRecipeId = (req, res, next) => {
    if (!req.body.recipe) req.body.recipe = req.params.recipeId;
    if (!req.body.author) req.body.author = req.user.id; // Set author from logged-in user
    next();
};

// @desc    Get all reviews for a specific recipe
// @route   GET /api/recipes/:recipeId/reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
    let query;

    if (req.params.recipeId) {
        // Get reviews for a specific recipe
        if (!mongoose.Types.ObjectId.isValid(req.params.recipeId)) {
            return res.status(400).json({ message: `Invalid recipe ID: ${req.params.recipeId}` });
        }
        query = Review.find({ recipe: req.params.recipeId });
    } else {
        // Get all reviews (potentially for admin or general browsing, less common)
        query = Review.find();
    }

    try {
        const reviews = await query.populate("author", "name profilePicture").populate("recipe", "title");
        res.json({ count: reviews.length, reviews });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single review by ID
// @route   GET /api/reviews/:id
// @access  Public
exports.getReviewById = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
                                   .populate("author", "name profilePicture")
                                   .populate("recipe", "title");

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }
        res.json(review);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid review ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Create a new review for a recipe
// @route   POST /api/recipes/:recipeId/reviews
// @access  Private
exports.createReview = async (req, res) => {
    const { rating, comment } = req.body;

    // Validation
    if (typeof rating === "undefined") {
        return res.status(400).json({ message: "Rating is required" });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        // Check if recipe exists and is approved
        const recipe = await Recipe.findOne({ _id: req.body.recipe, isApproved: true });
        if (!recipe) {
            return res.status(404).json({ message: `Recipe not found or not approved: ${req.body.recipe}` });
        }

        // Check if user has already reviewed this recipe
        const existingReview = await Review.findOne({ recipe: req.body.recipe, author: req.body.author });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this recipe" });
        }

        // Prevent user from reviewing their own recipe
        if (recipe.author.toString() === req.body.author) {
             return res.status(400).json({ message: "You cannot review your own recipe" });
        }

        const newReview = new Review({
            rating,
            comment,
            recipe: req.body.recipe,
            author: req.body.author
        });

        const savedReview = await newReview.save();

        // Manually trigger the post-save hook to update average rating (since it runs after save)
        // The hook defined in Review.js should handle this automatically, but calling explicitly ensures it
        // await savedReview.constructor.updateRecipeRating(savedReview.recipe);

        // Add the review reference to the recipe's reviews array
        await Recipe.findByIdAndUpdate(req.body.recipe, {
            $push: { reviews: savedReview._id }
        });

        res.status(201).json(savedReview);
    } catch (err) {
        console.error(err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
    const { rating, comment } = req.body;

    // Validation
    if (typeof rating !== "undefined" && (rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Check if the logged-in user is the author of the review
        if (review.author.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized to update this review" });
        }

        // Build update object
        const updateData = {};
        if (typeof rating !== "undefined") updateData.rating = rating;
        if (typeof comment !== "undefined") updateData.comment = comment;

        const updatedReview = await Review.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate("author", "name");

        // Manually trigger rating update if necessary (post-save hook should handle it)
        // await updatedReview.constructor.updateRecipeRating(updatedReview.recipe);

        res.json(updatedReview);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid review ID: ${req.params.id}` });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Check if the user is the author or an admin
        if (review.author.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(401).json({ message: "User not authorized to delete this review" });
        }

        const recipeId = review.recipe; // Store recipe ID before deleting review

        await review.deleteOne(); // Use deleteOne()

        // Remove the review reference from the recipe's reviews array
        await Recipe.findByIdAndUpdate(recipeId, {
            $pull: { reviews: req.params.id }
        });

        // Manually trigger rating update (post-remove hook should handle it)
        // await Review.updateRecipeRating(recipeId);

        res.json({ message: "Review removed successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid review ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

