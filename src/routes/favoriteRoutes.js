const express = require("express");
const router = express.Router();
const {
    getMyFavoriteLists,
    createFavoriteList,
    getFavoriteListById,
    updateFavoriteList,
    deleteFavoriteList,
    addRecipeToFavoriteList,
    removeRecipeFromFavoriteList
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

// All routes in this file are protected
router.use(protect);

// --- Favorite List Routes ---

// GET all lists for the user, POST a new list
router.route("/lists")
    .get(getMyFavoriteLists)
    .post(createFavoriteList);

// GET, PUT (rename), DELETE a specific list by its ID
router.route("/lists/:listId")
    .get(getFavoriteListById)
    .put(updateFavoriteList)
    .delete(deleteFavoriteList);

// --- Recipes within a Favorite List ---

// POST (add) a recipe to a specific list
router.post("/lists/:listId/recipes", addRecipeToFavoriteList);

// DELETE (remove) a recipe from a specific list
router.delete("/lists/:listId/recipes/:recipeId", removeRecipeFromFavoriteList);

module.exports = router;

