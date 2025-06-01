var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
require("dotenv").config(); // Load .env variables

// Import route handlers
var indexRouter = require("./routes/index");
var adminRouter = require("./routes/admin");

var app = express();

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware setup
app.use(logger("dev")); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from "public"

// --- Global Variables for Session (Mimicking mflix pattern) ---
// WARNING: Using global variables for session state is generally not recommended
// for production applications due to scalability and security concerns.
// Consider using express-session or similar middleware for robust session management.
app.use(function(req, res, next) {
    // Initialize global session variables if they don't exist
    if (typeof global.usuarioId === "undefined") {
        global.usuarioId = null;
        global.usuarioNome = null;
        global.usuarioIsAdmin = false;
    }
    if (typeof global.adminId === "undefined") {
        global.adminId = null;
        global.adminNome = null;
    }
    // Make session variables available in templates (optional, but can be useful)
    res.locals.usuarioNome = global.usuarioNome;
    res.locals.usuarioIsAdmin = global.usuarioIsAdmin;
    res.locals.adminNome = global.adminNome;
    next();
});

// Route definitions
app.use("/", indexRouter);
app.use("/admin", adminRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render("error"); // Assumes an error.ejs view exists
});

module.exports = app;

