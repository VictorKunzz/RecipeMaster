const FavoriteList = require("../models/FavoriteList");
const User = require("../models/User");
const Recipe = require("../models/Recipe");
const mongoose = require("mongoose");

// @desc    Get all favorite lists for the logged-in user
// @route   GET /api/favorites/lists
// @access  Private
exports.getMyFavoriteLists = async (req, res) => {
    try {
        const lists = await FavoriteList.find({ owner: req.user.id })
                                        .populate({
                                            path: "recipes",
                                            select: "title description images averageRating category", // Select fields to populate for recipes
                                            populate: { path: "category", select: "name" } // Populate category name within recipe
                                        })
                                        .sort({ createdAt: -1 });

        // If no lists found, maybe create a default one?
        if (!lists || lists.length === 0) {
            // Option 1: Return empty array
             return res.json([]);
            // Option 2: Create a default list if none exists
            /*
            const defaultList = new FavoriteList({ owner: req.user.id, name: "Meus Favoritos" });
            await defaultList.save();
            await User.findByIdAndUpdate(req.user.id, { $push: { favoriteLists: defaultList._id } });
            return res.status(201).json([defaultList]);
            */
        }

        res.json(lists);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Create a new favorite list
// @route   POST /api/favorites/lists
// @access  Private
exports.createFavoriteList = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "Favorite list name is required" });
    }

    try {
        // Check if a list with the same name already exists for this user
        const existingList = await FavoriteList.findOne({ owner: req.user.id, name });
        if (existingList) {
            return res.status(400).json({ message: `Favorite list named "${name}" already exists` });
        }

        const newList = new FavoriteList({
            name,
            owner: req.user.id,
            recipes: [] // Initialize with empty recipes array
        });

        const savedList = await newList.save();

        // Add reference to the user document
        await User.findByIdAndUpdate(req.user.id, { $push: { favoriteLists: savedList._id } });

        res.status(201).json(savedList);
    } catch (err) {
        console.error(err.message);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Get a specific favorite list by ID
// @route   GET /api/favorites/lists/:listId
// @access  Private
exports.getFavoriteListById = async (req, res) => {
    try {
        const list = await FavoriteList.findOne({ _id: req.params.listId, owner: req.user.id })
                                       .populate({
                                           path: "recipes",
                                           select: "title description images averageRating category",
                                           populate: { path: "category", select: "name" }
                                       });

        if (!list) {
            return res.status(404).json({ message: "Favorite list not found or you do not own it" });
        }

        res.json(list);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid list ID: ${req.params.listId}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Update a favorite list (e.g., rename)
// @route   PUT /api/favorites/lists/:listId
// @access  Private
exports.updateFavoriteList = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "New list name is required" });
    }

    try {
        let list = await FavoriteList.findOne({ _id: req.params.listId, owner: req.user.id });

        if (!list) {
            return res.status(404).json({ message: "Favorite list not found or you do not own it" });
        }

        // Check if new name already exists for this user (excluding current list)
        if (name.toLowerCase() !== list.name.toLowerCase()) {
             const existingList = await FavoriteList.findOne({ 
                 owner: req.user.id, 
                 name: { $regex: new RegExp(`^${name}$`, "i") },
                 _id: { $ne: req.params.listId }
             });
             if (existingList) {
                 return res.status(400).json({ message: `Favorite list named "${name}" already exists` });
             }
        }

        list.name = name;
        const updatedList = await list.save();

        res.json(updatedList);
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid list ID: ${req.params.listId}` });
        }
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Delete a favorite list
// @route   DELETE /api/favorites/lists/:listId
// @access  Private
exports.deleteFavoriteList = async (req, res) => {
    try {
        const list = await FavoriteList.findOne({ _id: req.params.listId, owner: req.user.id });

        if (!list) {
            return res.status(404).json({ message: "Favorite list not found or you do not own it" });
        }

        // Remove the list reference from the user document
        await User.findByIdAndUpdate(req.user.id, { $pull: { favoriteLists: list._id } });

        await list.deleteOne();

        res.json({ message: "Favorite list deleted successfully" });
    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid list ID: ${req.params.listId}` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Add a recipe to a favorite list
// @route   POST /api/favorites/lists/:listId/recipes
// @access  Private
exports.addRecipeToFavoriteList = async (req, res) => {
    const { recipeId } = req.body;
    const { listId } = req.params;

    if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ message: "Valid Recipe ID is required" });
    }
    if (!listId || !mongoose.Types.ObjectId.isValid(listId)) {
        return res.status(400).json({ message: "Valid List ID is required" });
    }

    try {
        // Find the list and check ownership
        const list = await FavoriteList.findOne({ _id: listId, owner: req.user.id });
        if (!list) {
            return res.status(404).json({ message: "Favorite list not found or you do not own it" });
        }

        // Check if recipe exists and is approved
        const recipe = await Recipe.findOne({ _id: recipeId, isApproved: true });
        if (!recipe) {
            return res.status(404).json({ message: "Recipe not found or not approved" });
        }

        // Check if recipe is already in the list
        const recipeExists = list.recipes.some(id => id.equals(recipeId));
        if (recipeExists) {
            return res.status(400).json({ message: "Recipe already in this favorite list" });
        }

        // Add recipe to the list
        list.recipes.push(recipeId);
        await list.save();

        // Populate the added recipe details for the response
        const updatedList = await FavoriteList.findById(listId).populate("recipes");

        res.json({ message: "Recipe added to favorites", list: updatedList });

    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid ID format` });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Remove a recipe from a favorite list
// @route   DELETE /api/favorites/lists/:listId/recipes/:recipeId
// @access  Private
exports.removeRecipeFromFavoriteList = async (req, res) => {
    const { listId, recipeId } = req.params;

    if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ message: "Valid Recipe ID is required in URL" });
    }
     if (!listId || !mongoose.Types.ObjectId.isValid(listId)) {
        return res.status(400).json({ message: "Valid List ID is required in URL" });
    }

    try {
        // Find the list and check ownership
        const list = await FavoriteList.findOne({ _id: listId, owner: req.user.id });
        if (!list) {
            return res.status(404).json({ message: "Favorite list not found or you do not own it" });
        }

        // Check if recipe exists in the list
        const recipeIndex = list.recipes.findIndex(id => id.equals(recipeId));
        if (recipeIndex === -1) {
            return res.status(404).json({ message: "Recipe not found in this favorite list" });
        }

        // Remove recipe from the list
        list.recipes.splice(recipeIndex, 1);
        await list.save();

        res.json({ message: "Recipe removed from favorites", list });

    } catch (err) {
        console.error(err.message);
        if (err.name === "CastError") {
            return res.status(400).json({ message: `Invalid ID format` });
        }
        res.status(500).send("Server Error");
    }
};

