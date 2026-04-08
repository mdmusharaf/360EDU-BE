// src/modules/content/banners.validation.js

const { body, query } = require("express-validator");
const { BANNER_SECTIONS } = require("../../models/banner.model");

const createBannerValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Banner title is required")
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),

  body("image")
    .notEmpty()
    .withMessage("Banner image is required")
    .isURL()
    .withMessage("Image must be a valid URL"),

  body("section")
    .optional()
    .isIn(BANNER_SECTIONS)
    .withMessage(`Section must be one of: ${BANNER_SECTIONS.join(", ")}`),

  body("linkType")
    .optional()
    .isIn(["internal", "external", "none"])
    .withMessage("linkType must be: internal, external, or none"),

  body("linkUrl")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("URL too long"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date")
    .toDate(),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date")
    .toDate()
    .custom((endDate, { req }) => {
      if (req.body.startDate && endDate <= new Date(req.body.startDate)) {
        throw new Error("endDate must be after startDate");
      }
      return true;
    }),

  body("order")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Order must be a positive integer")
    .toInt(),

  body("targetAudience")
    .optional()
    .isIn(["all", "guest", "member"])
    .withMessage("targetAudience must be: all, guest, or member"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

// Update uses same rules but all fields are optional
const updateBannerValidation = createBannerValidation.map((rule) =>
  rule.optional ? rule : rule,
);

const getBannersValidation = [
  query("section")
    .optional()
    .isIn(BANNER_SECTIONS)
    .withMessage(`Section must be one of: ${BANNER_SECTIONS.join(", ")}`),

  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

module.exports = {
  createBannerValidation,
  updateBannerValidation,
  getBannersValidation,
};
