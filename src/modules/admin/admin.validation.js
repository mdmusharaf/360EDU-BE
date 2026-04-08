// src/modules/admin/admin.validation.js

const { body, query } = require("express-validator");

const changeRoleValidation = [
  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["member", "supervisor"])
    .withMessage(
      "Role must be either member or supervisor — superadmin can only be set via the seeder script",
    ),
];

const assignPermissionsValidation = [
  body("activities.add")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
  body("activities.edit")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
  body("activities.delete")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
  body("plans.add").optional().isBoolean().withMessage("Must be true or false"),
  body("plans.edit")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
  body("plans.delete")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
  body("comments.manage")
    .optional()
    .isBoolean()
    .withMessage("Must be true or false"),
];

const getUsersValidation = [
  query("role")
    .optional()
    .isIn(["member", "supervisor", "superadmin"])
    .withMessage("Invalid role filter"),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

module.exports = {
  changeRoleValidation,
  assignPermissionsValidation,
  getUsersValidation,
};
