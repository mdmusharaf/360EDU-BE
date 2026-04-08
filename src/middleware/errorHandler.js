// src/middleware/errorHandler.js
//
// WHAT IS A GLOBAL ERROR HANDLER?
//
// In Express, any middleware with 4 parameters (err, req, res, next)
// is treated as an error handler. Express calls it automatically whenever:
//   1. You call next(error) from any middleware/controller
//   2. You throw inside an asyncHandler-wrapped function
//
// Without this, every controller would need its own try/catch.
// With this, errors bubble up here and we format them consistently.
//
// This must be registered LAST in app.js — after all routes.

const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  // Log the error in development so you can debug it
  if (process.env.NODE_ENV === "development") {
    console.error("❌ ERROR:", err);
  }

  // Default values — if nothing else matches, it's a 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  // ── Handle specific MongoDB / Mongoose errors ──────────────────────────
  //
  // Mongoose throws specific error types — we translate them to user-friendly messages.

  // Duplicate key (e.g. unique email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0]; // which field caused the conflict
    message = `${field} already in use`;
    errors = [`An account with this ${field} already exists`];
  }

  // Invalid MongoDB ObjectId (e.g. GET /users/not-a-valid-id)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
    errors = [`${err.value} is not a valid ID`];
  }

  // Mongoose validation errors (triggered when model validators fail)
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // JWT errors (shouldn't reach here normally — auth middleware handles them — but just in case)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token has expired";
  }

  // ── Send the response ──────────────────────────────────────────────────
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    // In development, show the full stack trace to help debug
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
