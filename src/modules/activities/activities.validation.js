// src/modules/activities/activities.validation.js
//
// We build validation in stages — only GET query params for now.
//
// WHY VALIDATE QUERY PARAMS?
// Without this, someone could send:
//   ?page=-1       → DB skip becomes negative
//   ?limit=99999   → returns millions of records, crashes server
//   ?ageGroup=xyz  → invalid value hits the DB for no reason

const { query } = require("express-validator");
const {
  ACTIVITY_AGE_GROUPS,
  ACTIVITY_FIELDS,
  ACTIVITY_GENDERS,
  ACTIVITY_LOCATIONS,
  ACTIVITY_GROUP_SIZES,
  ACTIVITY_METHODS,
} = require("../../models/activities.model");

const getActivitiesValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive number")
    .toInt(), // converts string "2" → integer 2 automatically

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),

  query("ageGroup")
    .optional()
    .isIn(ACTIVITY_AGE_GROUPS)
    .withMessage(`Age group must be one of: ${ACTIVITY_AGE_GROUPS.join(", ")}`),

  query("field")
    .optional()
    .isIn(ACTIVITY_FIELDS)
    .withMessage(`Field must be one of: ${ACTIVITY_FIELDS.join(", ")}`),

  query("gender")
    .optional()
    .isIn(ACTIVITY_GENDERS)
    .withMessage("Invalid gender filter"),

  query("location")
    .optional()
    .isIn(ACTIVITY_LOCATIONS)
    .withMessage("Invalid location filter"),

  query("groupSize")
    .optional()
    .isIn(ACTIVITY_GROUP_SIZES)
    .withMessage("Invalid group size filter"),

  query("method")
    .optional()
    .isIn(ACTIVITY_METHODS)
    .withMessage("Invalid method filter"),

  query("sort")
    .optional()
    .isIn(["newest", "oldest", "rating", "favorites"])
    .withMessage("Sort must be: newest, oldest, rating, or favorites"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query too long"),
];

module.exports = { getActivitiesValidation };

// ─── POST: Admin Create / Edit Activity ───────────────────────────────────────
const { body } = require("express-validator");

const activityValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Activity name is required")
    .isLength({ max: 150 })
    .withMessage("Name cannot exceed 150 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("ageGroup")
    .notEmpty()
    .withMessage("Age group is required")
    .isIn(ACTIVITY_AGE_GROUPS)
    .withMessage(`Must be one of: ${ACTIVITY_AGE_GROUPS.join(", ")}`),

  body("field")
    .notEmpty()
    .withMessage("Field is required")
    .isIn(ACTIVITY_FIELDS)
    .withMessage(`Must be one of: ${ACTIVITY_FIELDS.join(", ")}`),

  body("timeRequired")
    .notEmpty()
    .withMessage("Time required is required")
    .isInt({ min: 1 })
    .withMessage("Must be a positive number (minutes)")
    .toInt(),

  body("gender")
    .optional()
    .isIn(ACTIVITY_GENDERS)
    .withMessage("Invalid gender value"),

  body("location")
    .optional()
    .isIn(ACTIVITY_LOCATIONS)
    .withMessage("Invalid location value"),

  body("groupSize")
    .optional()
    .isIn(ACTIVITY_GROUP_SIZES)
    .withMessage("Invalid group size"),

  body("method")
    .optional()
    .isArray()
    .withMessage("Method must be an array")
    .custom((values) => {
      const invalid = values.filter((v) => !ACTIVITY_METHODS.includes(v));
      if (invalid.length)
        throw new Error(`Invalid methods: ${invalid.join(", ")}`);
      return true;
    }),

  body("steps").optional().isArray().withMessage("Steps must be an array"),

  body("steps.*")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Each step cannot exceed 1000 characters"),

  body("attachments")
    .optional()
    .isArray()
    .withMessage("Attachments must be an array"),

  body("attachments.*.label")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Attachment label is required"),

  body("attachments.*.url")
    .optional()
    .isURL()
    .withMessage("Attachment URL must be a valid URL"),
];

// ─── POST: Member Submit Activity ─────────────────────────────────────────────
// Same rules as admin create — status is forced to "pending" in the controller
const submitActivityValidation = [...activityValidation];

// ─── PATCH: Admin Review (approve / reject) ────────────────────────────────────
const reviewValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be approved or rejected"),

  body("rejectionReason")
    .if(body("status").equals("rejected"))
    .notEmpty()
    .withMessage("Rejection reason is required when rejecting"),
];

module.exports = {
  getActivitiesValidation,
  activityValidation,
  submitActivityValidation,
  reviewValidation,
};
