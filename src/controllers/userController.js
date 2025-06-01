const User = require("../models/User");
const Recipe = require("../models/Recipe");
const FavoriteList = require("../models/FavoriteList");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Helper function to delete a single image file
const deleteImageFile = (imagePath) => {
    if (!imagePath) return;
    // Construct full path assuming imagePath is relative like 'uploads/users/filename.jpg'
    const fullPath = path.join(__dirname, "../../", imagePath);
    fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') { // Ignore 'file not found' errors
            console.error(`Error deleting image ${fullPath}:`, err);
        }
    });
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        // req.user is populated by the 'protect' middleware
        const user = await User.findById(req.user.id).select("-password").populate("favoriteLists");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Update user profile (handles image uploads)
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    const { name, email, phone, birthDate, about } = req.body;
    const profileFields = {};
    if (name) profileFields.name = name;
    if (email) profileFields.email = email; // Consider adding email uniqueness check if changed
    if (phone) profileFields.phone = phone;
    if (birthDate) profileFields.birthDate = birthDate;
    if (about) profileFields.about = about;

    // Handle image uploads from req.files (populated by uploadUserImages middleware)
    let uploadedProfilePicPath = null;
    let uploadedCoverPhotoPath = null;

    if (req.files) {
        if (req.files.profilePicture) {
            uploadedProfilePicPath = `uploads/users/${req.files.profilePicture[0].filename}`;
            profileFields.profilePicture = uploadedProfilePicPath;
        }
        if (req.files.coverPhoto) {
            uploadedCoverPhotoPath = `uploads/users/${req.files.coverPhoto[0].filename}`;
            profileFields.coverPhoto = uploadedCoverPhotoPath;
        }
    }

    try {
        let user = await User.findById(req.user.id);
        if (!user) {
            // If user not found, delete uploaded files
            if (uploadedProfilePicPath) deleteImageFile(uploadedProfilePicPath);
            if (uploadedCoverPhotoPath) deleteImageFile(uploadedCoverPhotoPath);
            return res.status(404).json({ message: "User not found" });
        }

        // Store old image paths before updating
        const oldProfilePic = user.profilePicture;
        const oldCoverPhoto = user.coverPhoto;

        // Check if email is being updated and if it already exists for another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== req.user.id) {
                // If validation fails, delete uploaded files
                if (uploadedProfilePicPath) deleteImageFile(uploadedProfilePicPath);
                if (uploadedCoverPhotoPath) deleteImageFile(uploadedCoverPhotoPath);
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        // Update user document
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        ).select("-password");

        // Delete old images only after successful update and if new images were uploaded
        if (uploadedProfilePicPath && oldProfilePic && oldProfilePic !== uploadedProfilePicPath) {
            deleteImageFile(oldProfilePic);
        }
        if (uploadedCoverPhotoPath && oldCoverPhoto && oldCoverPhoto !== uploadedCoverPhotoPath) {
            deleteImageFile(oldCoverPhoto);
        }

        res.json(updatedUser);
    } catch (err) {
        // If any error occurs during update, delete newly uploaded files
        if (uploadedProfilePicPath) deleteImageFile(uploadedProfilePicPath);
        if (uploadedCoverPhotoPath) deleteImageFile(uploadedCoverPhotoPath);

        console.error(err.message);
        // Handle potential validation errors (e.g., invalid email format)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).send("Server Error");
    }
};

// @desc    Change user password
// @route   PUT /api/users/password
// @access  Private
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Please provide current and new passwords" });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if current password matches
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get user's favorite recipes (from default list or specified list)
// @route   GET /api/users/favorites
// @access  Private
exports.getUserFavorites = async (req, res) => {
    try {
        // Find the default favorite list for the user
        // This assumes a user might have multiple lists, but we fetch the primary one here.
        // Adjust logic if only one list per user is intended.
        const favoriteList = await FavoriteList.findOne({ owner: req.user.id /*, name: 'Meus Favoritos' */ })
                                             .populate('recipes'); // Populate the recipe details

        if (!favoriteList) {
            // If no list exists yet, return empty array or create one on the fly
            return res.json([]);
        }

        res.json(favoriteList.recipes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Get user's uploaded recipes
// @route   GET /api/users/my-recipes
// @access  Private
exports.getUserRecipes = async (req, res) => {
    try {
        const recipes = await Recipe.find({ author: req.user.id }).sort({ createdAt: -1 });
        res.json(recipes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// --- Admin Only --- (Example - move to adminController later if needed)

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete user's images before deleting user
        deleteImageFile(user.profilePicture);
        deleteImageFile(user.coverPhoto);

        // Add logic here to handle related data if necessary (e.g., reassign recipes? delete them?)
        // await Recipe.deleteMany({ author: user._id });
        // await Review.deleteMany({ author: user._id });
        // await FavoriteList.deleteMany({ owner: user._id });

        await user.deleteOne(); // Use deleteOne() instead of remove()

        res.json({ message: "User removed" });
    } catch (err) {
        console.error(err.message);
        // Handle CastError if ID format is invalid
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `Invalid user ID: ${req.params.id}` });
        }
        res.status(500).send("Server Error");
    }
};

