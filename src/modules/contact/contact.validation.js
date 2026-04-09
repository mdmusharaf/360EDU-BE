// src/modules/content/contactMessages.validation.js

const { body, query } = require("express-validator");
const { MESSAGE_TYPES } = require("../../models/contactMessage.model");

// ─── Public: Submit form ───────────────────────────────────────────────────────
const submitFormValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 60 })
    .withMessage("Name cannot exceed 60 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  // Image 1 shows format: 9665xxxxxxxx
  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile is required")
    .matches(/^966[0-9]{9}$/)
    .withMessage("Mobile must be in format: 966XXXXXXXXX"),

  body("messageType")
    .notEmpty()
    .withMessage("Message type is required")
    .isIn(MESSAGE_TYPES)
    .withMessage(`Message type must be one of: ${MESSAGE_TYPES.join(", ")}`),

  body("messageTitle")
    .trim()
    .notEmpty()
    .withMessage("Message title is required")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("messageText")
    .trim()
    .notEmpty()
    .withMessage("Message text is required")
    .isLength({ max: 2000 })
    .withMessage("Message cannot exceed 2000 characters"),

  body("attachment")
    .optional()
    .isURL()
    .withMessage("Attachment must be a valid URL"),
];

// ─── Admin: Reply ──────────────────────────────────────────────────────────────
const replyValidation = [
  body("reply")
    .trim()
    .notEmpty()
    .withMessage("Reply text is required")
    .isLength({ max: 2000 })
    .withMessage("Reply cannot exceed 2000 characters"),
];

// ─── Admin: Query filters ──────────────────────────────────────────────────────
const getMessagesValidation = [
  query("status")
    .optional()
    .isIn(["unread", "read", "replied"])
    .withMessage("Status must be: unread, read, or replied"),

  query("messageType")
    .optional()
    .isIn(MESSAGE_TYPES)
    .withMessage(`Message type must be one of: ${MESSAGE_TYPES.join(", ")}`),

  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  submitFormValidation,
  replyValidation,
  getMessagesValidation,
};
