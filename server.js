require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files (uploaded images)
// Make sure the path resolves correctly from where server.js is run
app.use("/uploads", express.static("uploads"));

// Database Connection
const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch(err => console.error("MongoDB connection error:", err));

// Basic Route for Testing
app.get("/", (req, res) => {
    res.json({ message: "Welcome to RecipeMaster API!" });
});

// --- Routes ---
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const recipeRoutes = require("./src/routes/recipeRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes"); // Standalone review routes
const favoriteRoutes = require("./src/routes/favoriteRoutes");
const adminRoutes = require("./src/routes/adminRoutes"); // Admin routes

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/recipes", recipeRoutes); // Includes nested /:recipeId/reviews
app.use("/api/categories", categoryRoutes);
app.use("/api/reviews", reviewRoutes); // Standalone review routes (e.g., /api/reviews/:id)
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes); // Mount admin routes
// -----------------------------

// Global Error Handler (Basic)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Export for potential testing

