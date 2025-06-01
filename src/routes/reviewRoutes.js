const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams allows access to :recipeId from parent router
const {
    getReviews,
    getReviewById,
    createReview,
    updateReview,
    deleteReview,
    setRecipeId // Middleware to automatically set recipeId and authorId
} = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/authMiddleware");

// --- Review Routes ---

// GET all reviews (for a specific recipe if :recipeId is present, or all reviews otherwise)
// POST a new review (for a specific recipe)
router.route("/")
    .get(getReviews)
    .post(protect, setRecipeId, createReview); // Protect route, set recipe/author IDs before creating

// GET, PUT, DELETE a specific review by its ID
router.route("/:id")
    .get(getReviewById)
    .put(protect, updateReview) // Only author can update
    .delete(protect, deleteReview); // Author or Admin can delete

module.exports = router;

