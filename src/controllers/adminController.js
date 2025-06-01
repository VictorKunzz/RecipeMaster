const User = require("../models/User");
const Recipe = require("../models/Recipe");
const Review = require("../models/Review");
const Category = require("../models/Category");

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const recipeCount = await Recipe.countDocuments();
        const approvedRecipeCount = await Recipe.countDocuments({ isApproved: true });
        const pendingRecipeCount = await Recipe.countDocuments({ isApproved: false });
        const categoryCount = await Category.countDocuments();
        const reviewCount = await Review.countDocuments();

        res.json({
            users: userCount,
            recipes: {
                total: recipeCount,
                approved: approvedRecipeCount,
                pending: pendingRecipeCount
            },
            categories: categoryCount,
            reviews: reviewCount
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// --- User Management (Admin) ---
// Note: Some user management routes might already exist in userRoutes.js
// Decide if they should be moved here or kept separate, ensuring admin protection.

// @desc    Get all users (Admin view)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.adminGetAllUsers = async (req, res) => {
    try {
        // Add pagination later if needed
        const users = await User.find({}).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get user details by ID (Admin view)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.adminGetUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid user ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Update user details (e.g., make admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.adminUpdateUser = async (req, res) => {
    // Only allow updating specific fields like isAdmin by an admin
    const { isAdmin } = req.body;
    const updateData = {};
    if (typeof isAdmin === "boolean") {
        updateData.isAdmin = isAdmin;
    }
    // Add other fields if needed (e.g., name, email - handle uniqueness)

    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid user ID: ${req.params.id}` });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Delete user (Admin action)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.adminDeleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add comprehensive cleanup logic here:
        // - Delete user's recipes?
        // - Delete user's reviews?
        // - Delete user's favorite lists?
        // - Remove user's reviews from other recipes?
        // await Recipe.deleteMany({ author: user._id });
        // await Review.deleteMany({ author: user._id });
        // await FavoriteList.deleteMany({ owner: user._id });

        await user.deleteOne();
        res.json({ message: "User removed successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid user ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

// --- Recipe Management (Admin) ---
// Note: Some actions like approve/get pending are already in recipeController, ensure admin protection there.

// @desc    Get all recipes (Admin view - includes pending)
// @route   GET /api/admin/recipes
// @access  Private/Admin
exports.adminGetAllRecipes = async (req, res) => {
    try {
        // Add pagination, filtering (by status, user, etc.) later
        const recipes = await Recipe.find({})
            .populate("category", "name")
            .populate("author", "name email")
            .sort({ createdAt: -1 });
        res.json(recipes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get recipe details by ID (Admin view)
// @route   GET /api/admin/recipes/:id
// @access  Private/Admin
exports.adminGetRecipeById = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id)
                                   .populate("category", "name")
                                   .populate("author", "name email profilePicture")
                                   .populate({ path: "reviews", populate: { path: "author", select: "name" } });
        if (!recipe) {
            return res.status(404).json({ message: "Recipe not found" });
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

// @desc    Update recipe details (Admin override)
// @route   PUT /api/admin/recipes/:id
// @access  Private/Admin
// (Similar to recipeController.updateRecipe, but ensures admin can update any recipe)
// Re-use or adapt logic from recipeController.updateRecipe if possible, ensuring admin privileges.

// @desc    Delete any recipe (Admin action)
// @route   DELETE /api/admin/recipes/:id
// @access  Private/Admin
// Re-use or adapt logic from recipeController.deleteRecipe, ensuring admin privileges.

// --- Review Management (Admin) ---

// @desc    Get all reviews (Admin view)
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.adminGetAllReviews = async (req, res) => {
    try {
        // Add pagination later
        const reviews = await Review.find({})
            .populate("author", "name email")
            .populate("recipe", "title")
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete any review (Admin action)
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
// Re-use or adapt logic from reviewController.deleteReview, ensuring admin privileges.

// --- Category Management (Admin) ---
// Actions (create, update, delete) are likely already in categoryController and protected by admin middleware.
// No need to duplicate here unless specific admin-only category views are required.

