const express = require("express");
const router = express.Router();

const {
  getPlans,
  getPlanById,
  getMyPlans,
  createPlan,
  updatePlan,
  deletePlan,
  enrollInPlan,
  completeActivityInPlan,
  createCustomPlan,
  toggleFavorite,
} = require("./plans.controller");

const {
  verifyJWT,
  authorize,
  checkPermission,
} = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Plans — Public
 *     description: No login required. Guests can browse.
 *   - name: Plans — Member
 *     description: Login required.
 *   - name: Plans — Admin
 *     description: Superadmin or supervisor with plans permission.
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get all platform plans (list)
 *     tags: [Plans — Public]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: ageGroup
 *         schema: { type: string, enum: ["3-6","6-9","9-12","12-15"] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Ramadan, General, Seasonal, Family, School, Weekend] }
 *       - in: query
 *         name: season
 *         schema: { type: string, enum: [Ramadan, Summer, Winter, Spring, Autumn, "All year", "School year", Holidays] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, rating, favorites], default: newest }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, maximum: 50 }
 *     responses:
 *       200:
 *         description: List of plans with pagination
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 plans:
 *                   - _id: "64abc123"
 *                     name: "Following the example | Ramadan path"
 *                     ageGroup: "9-12"
 *                     category: "Ramadan"
 *                     activitiesCount: 16
 *                     ratingAverage: 0
 *                     favoritesCount: 0
 *                 totalPlans: 67
 *                 pagination:
 *                   total: 67
 *                   page: 1
 *                   totalPages: 6
 *                   hasNextPage: true
 *                   hasPrevPage: false
 */
router.get("/", getPlans);

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: /my-plans and /custom MUST be above /:id
// Otherwise Express matches them as plan IDs → 404

/**
 * @swagger
 * /plans/my-plans:
 *   get:
 *     summary: Get my enrolled and custom plans
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Member's plans
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 enrolledPlans:
 *                   - _id: "64abc"
 *                     name: "Ramadan buds"
 *                     ageGroup: "3-6"
 *                     activitiesCount: 11
 *                     enrollment:
 *                       isCompleted: false
 *                       activityProgress:
 *                         - activity: "64xyz"
 *                           isCompleted: true
 *                           completedAt: "2025-03-01T00:00:00Z"
 *                 customPlans:
 *                   - _id: "64def"
 *                     name: "My summer plan"
 *                     activitiesCount: 4
 *                     assignedTo: { name: "Ali", ageGroup: "6-9" }
 *       401:
 *         description: Not logged in
 */
router.get("/my-plans", verifyJWT, getMyPlans);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/custom:
 *   post:
 *     summary: Create a custom personal plan
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ageGroup]
 *             properties:
 *               name:         { type: string, example: "My summer reading plan" }
 *               ageGroup:     { type: string, enum: ["3-6","6-9","9-12","12-15"], example: "6-9" }
 *               individualId: { type: string, description: "Assign to a managed individual", example: "64ind123" }
 *               activities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     activityId: { type: string }
 *                     order:      { type: integer }
 *                     stageLabel: { type: string }
 *     responses:
 *       201:
 *         description: Custom plan created
 *       400:
 *         description: Invalid activity IDs
 *       401:
 *         description: Not logged in
 */
router.post("/custom", verifyJWT, createCustomPlan);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Get single plan detail
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full plan detail
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 plan:
 *                   name: "Following the example | Ramadan path to creating conscious behavior"
 *                   ageGroup: "9-12"
 *                   fields: ["Family and social","Imany","Behavioral and ethical","Mental","Psychological and self-management"]
 *                   season: "Ramadan"
 *                   summary: "Developing behavioral awareness among participants..."
 *                   activitiesCount: 16
 *                   activities:
 *                     - order: 1
 *                       stageLabel: "The first stage: message from role model"
 *                       activity:
 *                         name: "رسالة من القدوة"
 *                         image: "https://..."
 *                         ageGroup: "9-12"
 *                         timeRequired: 30
 *                   isFavorited: false
 *                   isEnrolled: false
 *                   enrollmentProgress: null
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Plan not found
 */
router.get("/:id", verifyJWT, getPlanById);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}/enroll:
 *   post:
 *     summary: Add plan to personal profile (enroll)
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             Enroll yourself:
 *               value: {}
 *             Enroll for a child:
 *               value: { individualId: "64ind123" }
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       409:
 *         description: Already enrolled
 *       404:
 *         description: Plan not found
 */
router.post("/:id/enroll", verifyJWT, enrollInPlan);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}/activities/{activityId}/complete:
 *   post:
 *     summary: Mark an activity inside a plan as completed
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Plan ID
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema: { type: string }
 *         description: Activity ID inside the plan
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               individualId:
 *                 type: string
 *                 description: Optional — mark on behalf of an enrolled individual
 *     responses:
 *       200:
 *         description: Activity marked complete
 *         content:
 *           application/json:
 *             examples:
 *               Still in progress:
 *                 value:
 *                   message: "Activity marked as completed"
 *                   data: { activityCompleted: true, planCompleted: false }
 *               Plan finished:
 *                 value:
 *                   message: "Activity completed! You have finished this plan!"
 *                   data: { activityCompleted: true, planCompleted: true }
 *       400:
 *         description: Not enrolled in this plan
 *       409:
 *         description: Activity already completed
 */
router.post(
  "/:id/activities/:activityId/complete",
  verifyJWT,
  completeActivityInPlan,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}/favorite:
 *   post:
 *     summary: Toggle favorite on a plan
 *     tags: [Plans — Member]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Toggled
 *         content:
 *           application/json:
 *             examples:
 *               Added:
 *                 value: { data: { isFavorited: true, favoritesCount: 5 } }
 *               Removed:
 *                 value: { data: { isFavorited: false, favoritesCount: 4 } }
 */
router.post("/:id/favorite", verifyJWT, toggleFavorite);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Create a platform plan (Admin)
 *     tags: [Plans — Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Ramadan buds"
 *             ageGroup: "3-6"
 *             category: "Ramadan"
 *             season: "Ramadan"
 *             fields: ["Family and social","Imany"]
 *             summary: "A plan for young children during Ramadan..."
 *             description: "Full description..."
 *             activities:
 *               - activityId: "64act1"
 *                 order: 1
 *                 stageLabel: "The first stage"
 *               - activityId: "64act2"
 *                 order: 2
 *                 stageLabel: "The second stage"
 *     responses:
 *       201:
 *         description: Plan created and live
 *       400:
 *         description: Validation error or invalid activity IDs
 *       403:
 *         description: Not admin
 */
router.post(
  "/",
  verifyJWT,
  authorize("supervisor", "superadmin"),
  checkPermission("plans", "add"),
  createPlan,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}:
 *   patch:
 *     summary: Update a platform plan (Admin)
 *     tags: [Plans — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             name: "Updated plan name"
 *             isPublished: false
 *     responses:
 *       200:
 *         description: Plan updated
 *       404:
 *         description: Plan not found
 */
router.patch(
  "/:id",
  verifyJWT,
  authorize("supervisor", "superadmin"),
  checkPermission("plans", "edit"),
  updatePlan,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/{id}:
 *   delete:
 *     summary: Delete a platform plan (Admin)
 *     tags: [Plans — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Plan deleted
 *       404:
 *         description: Plan not found
 */
router.delete(
  "/:id",
  verifyJWT,
  authorize("supervisor", "superadmin"),
  checkPermission("plans", "delete"),
  deletePlan,
);

module.exports = router;
