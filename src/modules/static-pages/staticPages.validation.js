// src/modules/content/staticPages.validation.js

const { body, param } = require("express-validator");

const VALID_SLUGS = [
  "about-platform",
  "privacy-policy",
  "registration-terms",
  "activity-submission-terms",
  "contact-info",
];

const updatePageValidation = [
  param("slug")
    .isIn(VALID_SLUGS)
    .withMessage(`Slug must be one of: ${VALID_SLUGS.join(", ")}`),

  body("content").optional().isString().withMessage("Content must be a string"),

  body("metaTitle")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Meta title cannot exceed 100 characters"),

  body("metaDescription")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Meta description cannot exceed 200 characters"),

  body("isPublished")
    .optional()
    .isBoolean()
    .withMessage("isPublished must be true or false"),
];

module.exports = { updatePageValidation };
