// src/modules/search/search.validation.js
// Only 2 validation groups — advancedSearch removed (use /api/activities instead)

const { query } = require("express-validator");

const basicSearchValidation = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({ max: 100 })
    .withMessage("Search query too long"),
  query("type")
    .optional()
    .isIn(["activities", "plans", "all"])
    .withMessage("type must be: activities, plans, or all"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
];

const feedValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
];

module.exports = { basicSearchValidation, feedValidation };
