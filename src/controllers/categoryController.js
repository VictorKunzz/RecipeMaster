const Category = require("../models/Category");
const Recipe = require("../models/Recipe");
const mongoose = require("mongoose");

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 }); // Sort alphabetically
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single category by ID
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json(category);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid category ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: "Category name is required" });
    }

    try {
        // Check if category already exists (case-insensitive)
        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (existingCategory) {
            return res.status(400).json({ message: `Category '${name}' already exists` });
        }

        const newCategory = new Category({
            name,
            description
        });

        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (err) {
        console.error(err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        let category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Check if new name already exists (case-insensitive, excluding current category)
        if (name && name.toLowerCase() !== category.name.toLowerCase()) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, "i") },
                _id: { $ne: req.params.id } // Exclude the current category being updated
            });
            if (existingCategory) {
                return res.status(400).json({ message: `Category name '${name}' already exists` });
            }
        }

        // Build update object
        const updateData = {};
        if (name) updateData.name = name;
        if (typeof description !== 'undefined') updateData.description = description; // Allow setting empty description

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json(updatedCategory);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid category ID: ${req.params.id}` });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Optional: Check if any recipes are using this category before deleting
        const recipesInCategory = await Recipe.countDocuments({ category: req.params.id });
        if (recipesInCategory > 0) {
            return res.status(400).json({ message: `Cannot delete category '${category.name}' as it is currently assigned to ${recipesInCategory} recipe(s). Please reassign or delete recipes first.` });
            // Alternatively, you could reassign recipes to a default category or delete them.
        }

        await category.deleteOne();

        res.json({ message: "Category removed successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid category ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

