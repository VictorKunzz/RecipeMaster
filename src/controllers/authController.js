const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create new user instance
        user = new User({
            name,
            email,
            password, // Will be hashed before saving
            phone
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Save user to database
        await user.save();

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin // Include isAdmin status if needed elsewhere
            }
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 3600 * 24 }, // Expires in 24 hours (adjust as needed)
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, userId: user.id, name: user.name }); // Return token and basic user info
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin
            }
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 3600 * 24 }, // Expires in 24 hours
            (err, token) => {
                if (err) throw err;
                res.json({ token, userId: user.id, name: user.name, isAdmin: user.isAdmin }); // Return token and user info
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
};

// Placeholder for password reset functionality
// exports.requestPasswordReset = async (req, res) => { ... };
// exports.resetPassword = async (req, res) => { ... };

