// src/modules/admin/admin.routes.js
//
// ALL routes here require:
//   1. verifyJWT      — must be logged in
//   2. authorize("superadmin") — must be superadmin
//
// Applied once via router.use() at the top instead of repeating on every route.

const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  changeUserRole,
  assignPermissions,
  toggleUserStatus,
} = require("./admin.controller");

const {
  changeRoleValidation,
  assignPermissionsValidation,
  getUsersValidation,
} = require("./admin.validation");

const { verifyJWT, authorize } = require("../../middleware/auth.middleware");

// Apply auth + superadmin check to every route in this file
router.use(verifyJWT, authorize("superadmin"));

/**
 * @swagger
 * tags:
 *   - name: Admin — User Management
 *     description: Superadmin only. Manage users, roles and permissions.
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin — User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [member, supervisor, superadmin] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       403:
 *         description: Not a superadmin
 */
router.get("/users", getUsersValidation, getAllUsers);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Change a user's role
 *     description: |
 *       Promote a member to supervisor, or demote a supervisor back to member.
 *       When demoting — all supervisor permissions are automatically cleared.
 *       `superadmin` role cannot be assigned here — use the seeder script for that.
 *     tags: [Admin — User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [member, supervisor]
 *                 example: supervisor
 *           examples:
 *             Promote to supervisor:
 *               value: { role: supervisor }
 *             Demote to member:
 *               value: { role: member }
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "User role changed to supervisor successfully"
 *               data:
 *                 user:
 *                   username: "Ahmed"
 *                   email: "ahmed@example.com"
 *                   role: "supervisor"
 *                   supervisorPermissions:
 *                     activities: { add: false, edit: false, delete: false }
 *                     plans: { add: false, edit: false, delete: false }
 *                     comments: { manage: false }
 *       400:
 *         description: Cannot change own role or invalid role value
 *       403:
 *         description: Cannot change another superadmin's role
 *       404:
 *         description: User not found
 */
router.patch("/users/:id/role", changeRoleValidation, changeUserRole);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users/{id}/permissions:
 *   patch:
 *     summary: Assign scoped permissions to a supervisor
 *     description: |
 *       After promoting a user to supervisor, assign exactly what they can do.
 *       Only send the fields you want to change — omitted fields stay unchanged.
 *       Only works on users with role = supervisor.
 *     tags: [Admin — User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activities:
 *                 type: object
 *                 properties:
 *                   add:    { type: boolean }
 *                   edit:   { type: boolean }
 *                   delete: { type: boolean }
 *               plans:
 *                 type: object
 *                 properties:
 *                   add:    { type: boolean }
 *                   edit:   { type: boolean }
 *                   delete: { type: boolean }
 *               comments:
 *                 type: object
 *                 properties:
 *                   manage: { type: boolean }
 *           example:
 *             activities: { add: true, edit: true, delete: false }
 *             plans: { add: true, edit: false, delete: false }
 *             comments: { manage: true }
 *     responses:
 *       200:
 *         description: Permissions updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Permissions updated successfully"
 *               data:
 *                 user:
 *                   username: "Ahmed"
 *                   role: "supervisor"
 *                   supervisorPermissions:
 *                     activities: { add: true, edit: true, delete: false }
 *                     plans: { add: true, edit: false, delete: false }
 *                     comments: { manage: true }
 *       400:
 *         description: User is not a supervisor
 *       404:
 *         description: User not found
 */
router.patch(
  "/users/:id/permissions",
  assignPermissionsValidation,
  assignPermissions,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/users/{id}/toggle-status:
 *   patch:
 *     summary: Activate or deactivate a user account
 *     description: |
 *       Toggles isActive on/off. Deactivated users cannot log in.
 *       Their data is preserved (soft disable — not deleted).
 *       Cannot deactivate a superadmin or your own account.
 *     tags: [Admin — User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Status toggled
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "User deactivated successfully"
 *               data: { isActive: false }
 *       403:
 *         description: Cannot deactivate a superadmin
 */
router.patch("/users/:id/toggle-status", toggleUserStatus);

module.exports = router;
