const express = require("express");
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    changePassword,
    getUserFavorites,
    getUserRecipes,
    getAllUsers,      // Admin only
    deleteUser        // Admin only
} = require("../controllers/userController");
const { protect, admin } = require("../middleware/authMiddleware");
const { uploadUserImages } = require("../middleware/uploadMiddleware"); // Import user upload middleware

// --- User Specific Routes (Protected) ---

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get("/profile", protect, getUserProfile);

// @route   PUT api/users/profile
// @desc    Update user profile (handles image uploads)
// @access  Private
router.put("/profile", protect, uploadUserImages, updateUserProfile); // Add upload middleware here

// @route   PUT api/users/password
// @desc    Change user password
// @access  Private
router.put("/password", protect, changePassword);

// @route   GET api/users/favorites
// @desc    Get user's favorite recipes
// @access  Private
router.get("/favorites", protect, getUserFavorites);

// @route   GET api/users/my-recipes
// @desc    Get recipes uploaded by the user
// @access  Private
router.get("/my-recipes", protect, getUserRecipes);

// --- Admin Only Routes ---

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
router.get("/", protect, admin, getAllUsers);

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete("/:id", protect, admin, deleteUser);

module.exports = router;

