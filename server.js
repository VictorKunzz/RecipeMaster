require("dotenv").config();
const express = require("express");

const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Serve static files (uploaded images)
// Make sure the path resolves correctly from where server.js is run
app.use("/uploads", express.static("uploads"));




// Basic Route for Testing
app.get("/", (req, res) => {
    res.json({ message: "Welcome to RecipeMaster API!" });
});

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

