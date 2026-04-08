// src/modules/auth/auth.validation.js

const { body } = require("express-validator");

// Import enums from the model — single source of truth
// If the admin changes an age group label, it only needs updating in one place
const { AGE_GROUPS, INTEREST_FIELDS } = require("../../models/user.model");

// ─── SIGNUP VALIDATION ─────────────────────────────────────────────────────

const signupValidation = [
  // "Name" field
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 60 })
    .withMessage("Name must be 3-60 characters"),

  // "Email" field
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  // "Mobile number" field — Saudi format
  body("mobile")
    .notEmpty()
    .withMessage("Mobile number is required")
    .matches(/^\+966[0-9]{9}$/)
    .withMessage("Mobile must be a valid Saudi number (+966XXXXXXXXX)"),

  // "Password" field
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),

  // "Date of birth" field
  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Date of birth must be a valid date (YYYY-MM-DD)")
    .toDate() // converts the string to a JS Date object automatically
    .custom((value) => {
      // Basic sanity check: must be in the past and user must be at most 100 years old
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 100, 0, 1);
      if (value >= now) throw new Error("Date of birth must be in the past");
      if (value < minDate)
        throw new Error("Please enter a valid date of birth");
      return true;
    }),

  // "Sex" dropdown
  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),

  // "Personal trait" dropdown
  body("accountStatus")
    .optional()
    .isIn(["individual", "institution"])
    .withMessage("Personal trait must be individual or institution"),

  // "The state" — country
  body("country")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("Country name too long"),

  // "Al Madina" — city
  body("city")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("City name too long"),

  // "Interests by age groups" — array of checkboxes
  // optional at signup — user can set these later in settings
  body("interestAgeGroups")
    .optional()
    .isArray()
    .withMessage("interestAgeGroups must be an array")
    .custom((values) => {
      const invalid = values.filter((v) => !AGE_GROUPS.includes(v));
      if (invalid.length > 0)
        throw new Error(`Invalid age groups: ${invalid.join(", ")}`);
      return true;
    }),

  // "Interests by field" — array of checkboxes
  body("interestFields")
    .optional()
    .isArray()
    .withMessage("interestFields must be an array")
    .custom((values) => {
      const invalid = values.filter((v) => !INTEREST_FIELDS.includes(v));
      if (invalid.length > 0)
        throw new Error(`Invalid interest fields: ${invalid.join(", ")}`);
      return true;
    }),

  // "Profile" bio textarea
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Profile/Bio cannot exceed 500 characters"),

  // Terms agreement
  body("agreedToTerms")
    .equals("true")
    .withMessage("You must agree to the terms and conditions"),
];

// ─── LOGIN VALIDATION ──────────────────────────────────────────────────────

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = { signupValidation, loginValidation };
