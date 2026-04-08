const { body, param } = require("express-validator");
const mongoose = require("mongoose");
// 🔹 Helper: ObjectId validator
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createPlanValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be max 500 characters"),

  body("ageGroup").notEmpty().withMessage("Age group is required"),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),

  body("season").optional().isString().withMessage("Season must be a string"),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be boolean"),

  // 🔹 Activities array
  body("activities")
    .isArray({ min: 1 })
    .withMessage("At least one activity is required"),

  // 🔹 Each activity object
  body("activities.*.activityId")
    .notEmpty()
    .withMessage("Activity ID is required")
    .custom(isValidObjectId)
    .withMessage("Invalid Activity ID"),

  body("activities.*.order")
    .notEmpty()
    .withMessage("Order is required")
    .isInt({ min: 1 })
    .withMessage("Order must be a positive integer"),

  body("activities.*.stageLabel")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Stage label must be max 50 characters"),
];

// ─────────────────────────────────────────
// 🔹 Update Plan Validation
// ─────────────────────────────────────────
const updatePlanValidation = [
  body("name")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be max 500 characters"),

  body("ageGroup").optional(),

  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),

  body("season").optional().isString().withMessage("Season must be a string"),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be boolean"),

  body("activities")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Activities must be a non-empty array"),

  body("activities.*.activityId")
    .optional()
    .custom(isValidObjectId)
    .withMessage("Invalid Activity ID"),

  body("activities.*.order")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Order must be a positive integer"),

  body("activities.*.stageLabel")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Stage label must be max 50 characters"),
];

// ─────────────────────────────────────────
// 🔹 Params Validation
// ─────────────────────────────────────────
const planIdParamValidation = [
  param("id").custom(isValidObjectId).withMessage("Invalid Plan ID"),
];

const completeActivityValidation = [
  param("id").custom(isValidObjectId).withMessage("Invalid Plan ID"),

  param("activityId")
    .custom(isValidObjectId)
    .withMessage("Invalid Activity ID"),
];

module.exports = {
  createPlanValidation,
  updatePlanValidation,
  planIdParamValidation,
  completeActivityValidation,
};
