const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureUploadDirsExist = () => {
    const recipeDir = path.join(__dirname, "../../uploads/recipes");
    const userDir = path.join(__dirname, "../../uploads/users");
    if (!fs.existsSync(recipeDir)) {
        fs.mkdirSync(recipeDir, { recursive: true });
    }
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
};

ensureUploadDirsExist();

// --- Storage Configuration ---

const storage = (uploadPath) => multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath); // Use the provided path
    },
    filename: function (req, file, cb) {
        // Generate unique filename: fieldname-timestamp.extension
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

// --- File Filter --- 

const imageFileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        req.fileValidationError = "Only image files (jpg, jpeg, png, gif, webp) are allowed!";
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};

// --- Multer Instances ---

// For single recipe image (adjust if multiple needed for creation initially)
const uploadRecipeImage = multer({
    storage: storage(path.join(__dirname, "../../uploads/recipes")),
    fileFilter: imageFileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit per file
});

// For multiple recipe images (e.g., up to 5)
const uploadRecipeImages = multer({
    storage: storage(path.join(__dirname, "../../uploads/recipes")),
    fileFilter: imageFileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit per file
}).array("images", 5); // Field name 'images', max 5 files

// For user profile picture and cover photo
const uploadUserImages = multer({
    storage: storage(path.join(__dirname, "../../uploads/users")),
    fileFilter: imageFileFilter,
    limits: { fileSize: 1024 * 1024 * 3 } // 3MB limit per file
}).fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 }
]);

// Middleware to handle Multer errors gracefully
const handleMulterUpload = (uploadMiddleware) => (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
        if (req.fileValidationError) {
            return res.status(400).json({ message: req.fileValidationError });
        }
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size limit)
            return res.status(400).json({ message: `Multer error: ${err.message}` });
        }
        if (err) {
            // An unknown error occurred
            console.error("Unknown upload error:", err);
            return res.status(500).json({ message: "File upload failed" });
        }
        // Everything went fine.
        next();
    });
};

module.exports = {
    uploadRecipeImages: handleMulterUpload(uploadRecipeImages),
    uploadUserImages: handleMulterUpload(uploadUserImages)
};

