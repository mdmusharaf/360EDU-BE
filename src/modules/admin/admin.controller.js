// src/modules/admin/admin.controller.js
//
// WHO CAN ACCESS THIS MODULE?
// Only superadmin — enforced via authorize("superadmin") in the routes.
//
// WHAT THIS HANDLES:
//   - View all users
//   - Change a user's role (member ↔ supervisor)
//   - Assign scoped permissions to a supervisor
//   - Deactivate / reactivate a user
//
// WHY ROLES ARE CHANGED HERE AND NOT IN SIGNUP:
//   Signup always creates a member. This is intentional.
//   Roles are a privilege assigned by the superadmin, not self-declared.
//   If signup allowed role selection, anyone could register as superadmin.

const { validationResult } = require("express-validator");
const User = require("../../models/user.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new ApiError(
      400,
      "Validation failed",
      errors.array().map((e) => e.msg),
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL USERS  —  GET /api/admin/users
// ═══════════════════════════════════════════════════════════════════════════════
//
// Admin sees all members with their roles, status, and join date.
// Supports filtering by role and pagination.
//
// QUERY PARAMS:
//   ?role=member | supervisor | superadmin
//   ?isActive=true | false
//   ?page=1&limit=20

const getAllUsers = asyncHandler(async (req, res) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "username email mobile role accountStatus isActive createdAt country city",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Users fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHANGE USER ROLE  —  PATCH /api/admin/users/:id/role
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is the ONLY way to change a role in the system.
// Superadmin can:
//   - Promote member → supervisor
//   - Demote supervisor → member
//
// WHAT HAPPENS WHEN PROMOTED TO SUPERVISOR:
//   Role changes to "supervisor" but permissions are all false by default.
//   Superadmin then assigns specific permissions via PATCH /api/admin/users/:id/permissions
//
// WHAT HAPPENS WHEN DEMOTED TO MEMBER:
//   Role changes back to "member"
//   All supervisorPermissions are cleared (reset to false)
//
// PROTECTION: superadmin cannot change another superadmin's role.
// Only one superadmin role should exist — managed via the seeder script.
//
// REQUEST BODY:
//   { "role": "supervisor" }
//   { "role": "member" }

const changeUserRole = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { role } = req.body;
  const targetUserId = req.params.id;

  // Prevent superadmin from changing their own role (lockout protection)
  if (targetUserId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot change your own role");
  }

  // Find the user being updated
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new ApiError(404, "User not found");

  // Prevent changing another superadmin's role
  if (targetUser.role === "superadmin") {
    throw new ApiError(403, "Cannot change the role of another superadmin");
  }

  // Build the update object
  const update = { role };

  // If demoting to member — clear all supervisor permissions
  if (role === "member") {
    update.supervisorPermissions = {
      activities: { add: false, edit: false, delete: false },
      plans: { add: false, edit: false, delete: false },
      comments: { manage: false },
    };
  }

  const updatedUser = await User.findByIdAndUpdate(
    targetUserId,
    { $set: update },
    { new: true },
  ).select("username email role supervisorPermissions isActive");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        `User role changed to ${role} successfully`,
      ),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN SUPERVISOR PERMISSIONS  —  PATCH /api/admin/users/:id/permissions
// ═══════════════════════════════════════════════════════════════════════════════
//
// After promoting a user to supervisor, superadmin assigns
// exactly which sections they can manage and what they can do.
//
// Example: A content supervisor can add/edit activities but NOT delete them.
//
// REQUEST BODY:
// {
//   "activities": { "add": true, "edit": true,  "delete": false },
//   "plans":      { "add": true, "edit": false, "delete": false },
//   "comments":   { "manage": true }
// }

const assignPermissions = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw new ApiError(404, "User not found");

  // Can only assign permissions to supervisors
  if (targetUser.role !== "supervisor") {
    throw new ApiError(
      400,
      "Permissions can only be assigned to supervisors. Promote the user to supervisor first.",
    );
  }

  const { activities, plans, comments } = req.body;

  // Build permissions update using dot notation
  // Only update the fields that were actually sent in the request
  const permUpdate = {};

  if (activities) {
    if (activities.add !== undefined)
      permUpdate["supervisorPermissions.activities.add"] = activities.add;
    if (activities.edit !== undefined)
      permUpdate["supervisorPermissions.activities.edit"] = activities.edit;
    if (activities.delete !== undefined)
      permUpdate["supervisorPermissions.activities.delete"] = activities.delete;
  }
  if (plans) {
    if (plans.add !== undefined)
      permUpdate["supervisorPermissions.plans.add"] = plans.add;
    if (plans.edit !== undefined)
      permUpdate["supervisorPermissions.plans.edit"] = plans.edit;
    if (plans.delete !== undefined)
      permUpdate["supervisorPermissions.plans.delete"] = plans.delete;
  }
  if (comments) {
    if (comments.manage !== undefined)
      permUpdate["supervisorPermissions.comments.manage"] = comments.manage;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { $set: permUpdate },
    { new: true },
  ).select("username email role supervisorPermissions");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Permissions updated successfully",
      ),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE USER ACTIVE STATUS  —  PATCH /api/admin/users/:id/toggle-status
// ═══════════════════════════════════════════════════════════════════════════════
//
// Deactivates or reactivates a user account.
// Deactivated users cannot log in — verifyJWT checks isActive.
// Their data is preserved — this is a soft disable, not a delete.

const toggleUserStatus = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  if (!targetUser) throw new ApiError(404, "User not found");

  if (targetUser.role === "superadmin") {
    throw new ApiError(403, "Cannot deactivate a superadmin account");
  }

  // Prevent superadmin from deactivating themselves
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  targetUser.isActive = !targetUser.isActive;
  await targetUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isActive: targetUser.isActive },
        `User ${targetUser.isActive ? "activated" : "deactivated"} successfully`,
      ),
    );
});

module.exports = {
  getAllUsers,
  changeUserRole,
  assignPermissions,
  toggleUserStatus,
};
