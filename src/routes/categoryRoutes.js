const express = require("express");
const router = express.Router();
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");
const { protect, admin } = require("../middleware/authMiddleware");

// --- Public Category Routes ---

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", getAllCategories);

// @route   GET /api/categories/:id
// @desc    Get single category by ID
// @access  Public
router.get("/:id", getCategoryById);

// --- Admin Only Category Routes ---

// @route   POST /api/categories
// @desc    Create a new category
// @access  Private/Admin
router.post("/", protect, admin, createCategory);

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private/Admin
router.put("/:id", protect, admin, updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private/Admin
router.delete("/:id", protect, admin, deleteCategory);

module.exports = router;

