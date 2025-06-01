const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    adminGetAllUsers,
    adminGetUserById,
    adminUpdateUser,
    adminDeleteUser,
    adminGetAllRecipes,
    adminGetRecipeById,
    adminGetAllReviews
    // Import other admin-specific controller functions as needed
} = require("../controllers/adminController");

// Import recipe/review controllers if reusing delete/update logic
const { deleteRecipe, updateRecipe, approveRecipe, getPendingRecipes } = require("../controllers/recipeController");
const { deleteReview } = require("../controllers/reviewController");

const { protect, admin } = require("../middleware/authMiddleware");

// Apply protect and admin middleware to all routes in this file
router.use(protect, admin);

// --- Dashboard --- 
// @route   GET /api/admin/dashboard
router.get("/dashboard", getDashboardStats);

// --- User Management --- 
// @route   GET /api/admin/users
router.get("/users", adminGetAllUsers);
// @route   GET /api/admin/users/:id
// @route   PUT /api/admin/users/:id
// @route   DELETE /api/admin/users/:id
router.route("/users/:id")
    .get(adminGetUserById)
    .put(adminUpdateUser)
    .delete(adminDeleteUser); // Use admin-specific delete or reuse from userController with admin check

// --- Recipe Management --- 
// @route   GET /api/admin/recipes (includes pending)
router.get("/recipes", adminGetAllRecipes);
// @route   GET /api/admin/recipes/pending
router.get("/recipes/pending", getPendingRecipes); // Reuse from recipeController
// @route   GET /api/admin/recipes/:id
// @route   PUT /api/admin/recipes/:id (Admin update override)
// @route   DELETE /api/admin/recipes/:id (Admin delete override)
router.route("/recipes/:id")
    .get(adminGetRecipeById)
    .put(updateRecipe) // Reuse from recipeController (it already checks for admin)
    .delete(deleteRecipe); // Reuse from recipeController (it already checks for admin)
// @route   PUT /api/admin/recipes/:id/approve
router.put("/recipes/:id/approve", approveRecipe); // Reuse from recipeController

// --- Review Management --- 
// @route   GET /api/admin/reviews
router.get("/reviews", adminGetAllReviews);
// @route   DELETE /api/admin/reviews/:id
router.delete("/reviews/:id", deleteReview); // Reuse from reviewController (it already checks for admin)

// --- Category Management --- 
// Category CRUD operations are already in categoryRoutes and protected by admin middleware.
// No need to add them here unless there are admin-specific views/actions.

module.exports = router;

