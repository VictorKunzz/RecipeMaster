const express = require("express");
const router = express.Router();
const {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    getPendingRecipes, // Admin
    approveRecipe      // Admin
} = require("../controllers/recipeController");
const { protect, admin } = require("../middleware/authMiddleware");
const { uploadRecipeImages } = require("../middleware/uploadMiddleware"); // Import upload middleware
const reviewRouter = require("./reviewRoutes"); // Import review router for nested routes

// Re-route requests for reviews on a specific recipe to the review router
// e.g., /api/recipes/:recipeId/reviews
router.use("/:recipeId/reviews", reviewRouter);

// --- Public Recipe Routes ---

// @route   GET /api/recipes
// @desc    Get all approved recipes (paginated, searchable, filterable)
// @access  Public
router.get("/", getAllRecipes);

// @route   GET /api/recipes/:id
// @desc    Get single approved recipe by ID
// @access  Public
router.get("/:id", getRecipeById);

// --- Protected Recipe Routes ---

// @route   POST /api/recipes
// @desc    Create a new recipe (handles image uploads)
// @access  Private
router.post("/", protect, uploadRecipeImages, createRecipe); // Add upload middleware here

// @route   PUT /api/recipes/:id
// @desc    Update a recipe (by author or admin, handles image uploads)
// @access  Private
router.put("/:id", protect, uploadRecipeImages, updateRecipe); // Add upload middleware here

// @route   DELETE /api/recipes/:id
// @desc    Delete a recipe (by author or admin)
// @access  Private
router.delete("/:id", protect, deleteRecipe);

// --- Admin Only Recipe Routes ---

// @route   GET /api/recipes/pending
// @desc    Get recipes pending approval
// @access  Private/Admin
router.get("/admin/pending", protect, admin, getPendingRecipes);

// @route   PUT /api/recipes/:id/approve
// @desc    Approve a recipe
// @access  Private/Admin
router.put("/admin/:id/approve", protect, admin, approveRecipe);

module.exports = router;

