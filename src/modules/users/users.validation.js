const { body } = require("express-validator");
const { AGE_GROUPS, INTEREST_FIELDS } = require("../../models/user.model");

const updateProfileValidation = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 60 })
    .withMessage("Name must be 3-60 characters"),
  body("mobile")
    .optional()
    .matches(/^\+966[0-9]{9}$/)
    .withMessage("Mobile must be a valid Saudi number (+966XXXXXXXXX)"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date")
    .toDate(),
  body("gender")
    .optional()
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),
  body("country")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("Country name too long"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage("City name too long"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),
  body("accountStatus")
    .optional()
    .isIn(["individual", "institution"])
    .withMessage("Invalid account status"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Must contain at least one number"),
  body("confirmNewPassword")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword)
        throw new Error("Passwords do not match");
      return true;
    }),
];

const individualValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 50 })
    .withMessage("Name cannot exceed 50 characters"),
  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),
  body("ageGroup")
    .notEmpty()
    .withMessage("Age group is required")
    .isIn(AGE_GROUPS)
    .withMessage(`Age group must be one of: ${AGE_GROUPS.join(", ")}`),
];

// Replaces both interest arrays at once
const updateInterestsValidation = [
  body("interestAgeGroups")
    .isArray()
    .withMessage("interestAgeGroups must be an array")
    .custom((values) => {
      const invalid = values.filter((v) => !AGE_GROUPS.includes(v));
      if (invalid.length)
        throw new Error(`Invalid age groups: ${invalid.join(", ")}`);
      return true;
    }),
  body("interestFields")
    .isArray()
    .withMessage("interestFields must be an array")
    .custom((values) => {
      const invalid = values.filter((v) => !INTEREST_FIELDS.includes(v));
      if (invalid.length)
        throw new Error(`Invalid fields: ${invalid.join(", ")}`);
      return true;
    }),
];

const updateNotifPrefsValidation = [
  body("email")
    .optional()
    .isBoolean()
    .withMessage("email pref must be true or false"),
  body("push")
    .optional()
    .isBoolean()
    .withMessage("push pref must be true or false"),
  body("sms")
    .optional()
    .isBoolean()
    .withMessage("sms pref must be true or false"),
];

module.exports = {
  updateProfileValidation,
  changePasswordValidation,
  individualValidation,
  updateInterestsValidation,
  updateNotifPrefsValidation,
};
