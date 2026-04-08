const express = require("express");
const router = express.Router();

const {
  getActivities,
  getActivityById,
  createActivity,
  submitActivity,
  reviewActivity,
  getMySubmissions,
} = require("./activities.controller");

const {
  getActivitiesValidation,
  activityValidation,
  submitActivityValidation,
  reviewValidation,
} = require("./activities.validation");

const {
  verifyJWT,
  authorize,
  checkPermission,
} = require("../../middleware/auth.middleware");

// ─────────────────────────────────────────────────────────────────────────────
// SWAGGER TAGS — groups endpoints in the docs UI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   - name: Activities — Public
 *     description: No login required. Available to guests.
 *   - name: Activities — Member
 *     description: Login required. For logged-in members.
 *   - name: Activities — Admin
 *     description: Admin or supervisor with permission only.
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities:
 *   get:
 *     summary: Get all activities (list with filters)
 *     tags: [Activities — Public]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Keyword search on name and description
 *         example:
 *       - in: query
 *         name: ageGroup
 *         schema:
 *           type: string
 *           enum: [3-6, 6-9, 9-12, 12-15]
 *         description: Filter by age group
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *           enum: [Family and social, Imany, Behavioral and ethical, Mental, Language and Communication, Sharia science, Psychological and self-management]
 *         description: Filter by domain/field
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [everyone, male, female]
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *           enum: [closed, open, both]
 *       - in: query
 *         name: groupSize
 *         schema:
 *           type: string
 *           enum: [individual, small group, large group]
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [Mental/Thinking, Practical/Performance, Story, Acting, Visits, Discussion, Games]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, rating, favorites]
 *         description: Sort order (default is newest)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 *     responses:
 *       200:
 *         description: List of activities with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityCard'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/", getActivitiesValidation, getActivities);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities/my-submissions:
 *   get:
 *     summary: Get my submitted activities
 *     tags: [Activities — Member]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member's submitted activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:             { type: string }
 *                           name:            { type: string }
 *                           image:           { type: string }
 *                           ageGroup:        { type: string }
 *                           field:           { type: string }
 *                           status:          { type: string, enum: [pending, live, rejected] }
 *                           rejectionReason: { type: string }
 *                           createdAt:       { type: string, format: date-time }
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/my-submissions", verifyJWT, getMySubmissions);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities/submit:
 *   post:
 *     summary: Submit/propose a new activity
 *     tags: [Activities — Member]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityInput'
 *           example:
 *             name: "Morris Cipher"
 *             description: "A fun game where participants search for hidden treasure..."
 *             ageGroup: "6-9"
 *             field: "Mental"
 *             timeRequired: 45
 *             gender: "everyone"
 *             location: "closed"
 *             groupSize: "small group"
 *             method: ["Mental/Thinking", "Games"]
 *             steps:
 *               - "Educator explains the idea of the activity"
 *               - "Educator divides participants into groups"
 *               - "Distribute worksheets"
 *     responses:
 *       201:
 *         description: Activity submitted and pending review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Activity submitted successfully. It will be reviewed by our team." }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activity:
 *                       $ref: '#/components/schemas/ActivityDetail'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post(
  "/submit",
  verifyJWT,
  authorize("member", "supervisor", "superadmin"),
  submitActivityValidation,
  submitActivity,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities/{id}:
 *   get:
 *     summary: Get single activity detail
 *     tags: [Activities — Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full activity detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activity:
 *                       $ref: '#/components/schemas/ActivityDetail'
 *                     similar:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityCard'
 *       401:
 *         description: Not logged in — redirect to login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Activity not found or not live
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/:id", verifyJWT, getActivityById);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities:
 *   post:
 *     summary: Create a new activity (Admin)
 *     tags: [Activities — Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityInput'
 *           example:
 *             name: "Profession and tools"
 *             description: "This activity contributes to improving the relationship between participants..."
 *             ageGroup: "3-6"
 *             field: "Family and social"
 *             timeRequired: 30
 *             gender: "everyone"
 *             location: "both"
 *             groupSize: "small group"
 *             method: ["Mental/Thinking", "Practical/Performance"]
 *             steps:
 *               - "The educator explains the importance of having professions in our lives"
 *               - "The educator explains the idea of the activity to the participants"
 *               - "The educator divides the participants into groups according to their number"
 *             attachments:
 *               - label: "Profession and tools"
 *                 url: "https://cloudinary.com/sample.pdf"
 *     responses:
 *       201:
 *         description: Activity created and live
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activity:
 *                       $ref: '#/components/schemas/ActivityDetail'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Not logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Insufficient role or permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post(
  "/",
  verifyJWT,
  authorize("supervisor", "superadmin"),
  checkPermission("activities", "add"),
  activityValidation,
  createActivity,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /activities/{id}/review:
 *   patch:
 *     summary: Approve or reject a member submission (Admin)
 *     tags: [Activities — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the activity to review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: approved
 *               rejectionReason:
 *                 type: string
 *                 description: Required only when status is rejected
 *                 example: "Content is not appropriate for this age group"
 *           examples:
 *             Approve:
 *               value:
 *                 status: approved
 *             Reject:
 *               value:
 *                 status: rejected
 *                 rejectionReason: "Content is not appropriate for this age group"
 *     responses:
 *       200:
 *         description: Activity reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Activity approved successfully" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     activity:
 *                       $ref: '#/components/schemas/ActivityDetail'
 *       400:
 *         description: Validation error (e.g. rejectionReason missing)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Activity not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.patch(
  "/:id/review",
  verifyJWT,
  authorize("supervisor", "superadmin"),
  checkPermission("activities", "edit"),
  reviewValidation,
  reviewActivity,
);

module.exports = router;
