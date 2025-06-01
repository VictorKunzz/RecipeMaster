const Recipe = require("../models/Recipe");
const Category = require("../models/Category");
const User = require("../models/User");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Helper function to delete images
const deleteImages = (imagePaths) => {
    if (!imagePaths || imagePaths.length === 0) return;
    imagePaths.forEach(imagePath => {
        // Construct full path assuming imagePath is relative like 'uploads/recipes/filename.jpg'
        const fullPath = path.join(__dirname, "../../", imagePath);
        fs.unlink(fullPath, (err) => {
            if (err) {
                // Log error but don't block execution (e.g., file already deleted)
                console.error(`Error deleting image ${fullPath}:`, err);
            }
        });
    });
};

// @desc    Get all recipes (paginated, searchable, filterable by category)
// @route   GET /api/recipes
// @access  Public
exports.getAllRecipes = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Search by keyword (title or description)
    if (req.query.search) {
        query.$text = { $search: req.query.search };
    }

    // Filter by category name
    if (req.query.category) {
        try {
            const category = await Category.findOne({ name: { $regex: new RegExp(`^${req.query.category}$`, "i") } }); // Case-insensitive match
            if (category) {
                query.category = category._id;
            } else {
                // If category doesn't exist, return no recipes for that category
                return res.json({ recipes: [], page, pages: 0, total: 0 });
            }
        } catch (err) {
            console.error("Error finding category:", err);
            return res.status(500).send("Server Error finding category");
        }
    }

    // Filter by author ID
    if (req.query.author) {
        if (mongoose.Types.ObjectId.isValid(req.query.author)) {
            query.author = req.query.author;
        } else {
            return res.status(400).json({ message: "Invalid author ID format" });
        }
    }

    // Only show approved recipes for public view
    query.isApproved = true;

    try {
        const totalRecipes = await Recipe.countDocuments(query);
        const recipes = await Recipe.find(query)
            .populate("category", "name") // Populate category name
            .populate("author", "name") // Populate author name
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(limit);

        res.json({
            recipes,
            page,
            pages: Math.ceil(totalRecipes / limit),
            total: totalRecipes
        });
    } catch (err) {
        console.error(err.message);
        // Handle specific errors like invalid search syntax if needed
        res.status(500).send("Server Error");
    }
};

// @desc    Get a single recipe by ID
// @route   GET /api/recipes/:id
// @access  Public
exports.getRecipeById = async (req, res) => {
    try {
        const recipe = await Recipe.findOne({ _id: req.params.id, isApproved: true })
                                   .populate("category", "name")
                                   .populate("author", "name profilePicture")
                                   .populate({
                                       path: "reviews",
                                       populate: { path: "author", select: "name profilePicture" } // Populate author of reviews
                                   });

        if (!recipe) {
            return res.status(404).json({ message: "Recipe not found or not approved" });
        }
        res.json(recipe);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid recipe ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Create a new recipe (handles image uploads)
// @route   POST /api/recipes
// @access  Private
exports.createRecipe = async (req, res) => {
    const {
        title,
        description,
        category, // Expecting category ID or name
        prepTime,
        yield: recipeYield, // Use recipeYield because yield is a reserved keyword
        ingredients,
        instructions,
    } = req.body;

    // Basic validation
    if (!title || !description || !category || !ingredients || !instructions) {
        // If validation fails after files are uploaded, delete them
        if (req.files && req.files.length > 0) {
            deleteImages(req.files.map(file => file.path.replace(__dirname + '/../../', ''))); // Get relative path
        }
        return res.status(400).json({ message: "Please provide all required fields: title, description, category, ingredients, instructions" });
    }

    // Get image paths from multer upload (if any)
    const imagePaths = req.files ? req.files.map(file => `uploads/recipes/${file.filename}`) : [];

    try {
        // Find category ID - allow providing name or ID
        let categoryId;
        if (mongoose.Types.ObjectId.isValid(category)) {
            const foundCategory = await Category.findById(category);
            if (!foundCategory) {
                 if (imagePaths.length > 0) deleteImages(imagePaths);
                 return res.status(400).json({ message: `Category with ID ${category} not found` });
            }
            categoryId = foundCategory._id;
        } else {
            // Try finding by name (case-insensitive)
            const foundCategory = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, "i") } });
            if (!foundCategory) {
                if (imagePaths.length > 0) deleteImages(imagePaths);
                return res.status(400).json({ message: `Category with name '${category}' not found` });
            }
            categoryId = foundCategory._id;
        }

        const newRecipe = new Recipe({
            title,
            description,
            category: categoryId,
            prepTime,
            yield: recipeYield,
            ingredients: Array.isArray(ingredients) ? ingredients : ingredients.split('\n'), // Ensure array, split by newline if string
            instructions: Array.isArray(instructions) ? instructions : instructions.split('\n'), // Ensure array, split by newline if string
            author: req.user.id, // From protect middleware
            isApproved: !req.user.isAdmin, // Auto-approve if created by admin, otherwise requires approval (adjust logic as needed)
            images: imagePaths // Add uploaded image paths
        });

        const savedRecipe = await newRecipe.save();
        res.status(201).json(savedRecipe);
    } catch (err) {
        // If error occurs after saving files, delete them
        if (imagePaths.length > 0) {
            deleteImages(imagePaths);
        }
        console.error(err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Update a recipe (handles image uploads/updates)
// @route   PUT /api/recipes/:id
// @access  Private
exports.updateRecipe = async (req, res) => {
    const { title, description, category, prepTime, yield: recipeYield, ingredients, instructions, isApproved, existingImages } = req.body;
    // existingImages should be an array of image paths (strings) the user wants to keep

    try {
        let recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            // If recipe not found, delete any newly uploaded files
            if (req.files && req.files.length > 0) deleteImages(req.files.map(file => `uploads/recipes/${file.filename}`));
            return res.status(404).json({ message: "Recipe not found" });
        }

        // Check if the user is the author or an admin
        if (recipe.author.toString() !== req.user.id && !req.user.isAdmin) {
            if (req.files && req.files.length > 0) deleteImages(req.files.map(file => `uploads/recipes/${file.filename}`));
            return res.status(401).json({ message: "User not authorized to update this recipe" });
        }

        // --- Handle Image Updates ---
        let currentImages = recipe.images || [];
        const newImagePaths = req.files ? req.files.map(file => `uploads/recipes/${file.filename}`) : [];
        let updatedImages = [];

        // Keep images specified in existingImages
        if (existingImages) {
            const imagesToKeep = Array.isArray(existingImages) ? existingImages : [existingImages];
            updatedImages = currentImages.filter(img => imagesToKeep.includes(img));
        }

        // Add newly uploaded images
        updatedImages = [...updatedImages, ...newImagePaths];

        // Identify images to delete (those in currentImages but not in updatedImages and not in newImagePaths)
        const imagesToDelete = currentImages.filter(img => !updatedImages.includes(img));
        deleteImages(imagesToDelete);
        // ---------------------------

        // Find category ID if provided
        let categoryId = recipe.category;
        if (category && category.toString() !== recipe.category.toString()) {
            if (mongoose.Types.ObjectId.isValid(category)) {
                const foundCategory = await Category.findById(category);
                if (!foundCategory) {
                    if (newImagePaths.length > 0) deleteImages(newImagePaths);
                    return res.status(400).json({ message: `Category with ID ${category} not found` });
                }
                categoryId = foundCategory._id;
            } else {
                const foundCategory = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, "i") } });
                if (!foundCategory) {
                     if (newImagePaths.length > 0) deleteImages(newImagePaths);
                     return res.status(400).json({ message: `Category with name '${category}' not found` });
                }
                categoryId = foundCategory._id;
            }
        }

        // Build update object
        const updateData = { images: updatedImages }; // Start with updated images
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (category) updateData.category = categoryId;
        if (prepTime) updateData.prepTime = prepTime;
        if (recipeYield) updateData.yield = recipeYield;
        if (ingredients) updateData.ingredients = Array.isArray(ingredients) ? ingredients : ingredients.split('\n');
        if (instructions) updateData.instructions = Array.isArray(instructions) ? instructions : instructions.split('\n');
        // Only admin can change approval status directly via update
        if (req.user.isAdmin && typeof isApproved === 'boolean') {
            updateData.isApproved = isApproved;
        }

        const updatedRecipe = await Recipe.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate("category", "name").populate("author", "name");

        res.json(updatedRecipe);
    } catch (err) {
         // If error occurs after saving files, delete them
        if (req.files && req.files.length > 0) {
            deleteImages(req.files.map(file => `uploads/recipes/${file.filename}`));
        }
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid recipe ID: ${req.params.id}` });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a recipe (also deletes images)
// @route   DELETE /api/recipes/:id
// @access  Private
exports.deleteRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ message: "Recipe not found" });
        }

        // Check if the user is the author or an admin
        if (recipe.author.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(401).json({ message: "User not authorized to delete this recipe" });
        }

        // Delete associated images first
        deleteImages(recipe.images);

        // Optional: Add logic to delete associated reviews, remove from favorite lists
        // await Review.deleteMany({ recipe: recipe._id });
        // await FavoriteList.updateMany({}, { $pull: { recipes: recipe._id } });

        await recipe.deleteOne();

        res.json({ message: "Recipe removed successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid recipe ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// --- Admin Specific --- (Example: Get recipes pending approval)

// @desc    Get all recipes pending approval
// @route   GET /api/recipes/pending
// @access  Private/Admin
exports.getPendingRecipes = async (req, res) => {
    try {
        const pendingRecipes = await Recipe.find({ isApproved: false })
            .populate("category", "name")
            .populate("author", "name email")
            .sort({ createdAt: 1 }); // Show oldest first

        res.json(pendingRecipes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Approve a recipe
// @route   PUT /api/recipes/:id/approve
// @access  Private/Admin
exports.approveRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);

        if (!recipe) {
            return res.status(404).json({ message: "Recipe not found" });
        }

        if (recipe.isApproved) {
            return res.status(400).json({ message: "Recipe is already approved" });
        }

        recipe.isApproved = true;
        await recipe.save();

        // Optional: Notify the author

        res.json({ message: "Recipe approved successfully", recipe });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid recipe ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

