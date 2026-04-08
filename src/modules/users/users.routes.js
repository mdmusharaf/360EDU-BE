const express = require("express");
const router = express.Router();

const {
  getProfile,
  updateProfile,
  changePassword,
  updateInterests,
  updateNotifPrefs,
  getIndividuals,
  createIndividual,
  updateIndividual,
  deleteIndividual,
} = require("./users.controller");

const {
  updateProfileValidation,
  changePasswordValidation,
  individualValidation,
  updateInterestsValidation,
  updateNotifPrefsValidation,
} = require("./users.validation");

const { verifyJWT } = require("../../middleware/auth.middleware");

router.use(verifyJWT);

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User profile operations
 *   - name: Individuals
 *     description: Managed individuals under a user
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 */
router.get("/profile", getProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch("/profile", updateProfileValidation, updateProfile);

/**
 * @swagger
 * /users/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.patch("/change-password", changePasswordValidation, changePassword);

/**
 * @swagger
 * /users/interests:
 *   put:
 *     summary: Update user interests
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interestAgeGroups:
 *                 type: array
 *                 items:
 *                   type: string
 *               interestFields:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Interests updated successfully
 */
router.put("/interests", updateInterestsValidation, updateInterests);

/**
 * @swagger
 * /users/notification-prefs:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences updated
 */
router.patch(
  "/notification-prefs",
  updateNotifPrefsValidation,
  updateNotifPrefs,
);

/**
 * @swagger
 * /users/individuals:
 *   get:
 *     summary: Get all individuals managed by the user
 *     tags: [Individuals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of individuals
 */
router.get("/individuals", getIndividuals);

/**
 * @swagger
 * /users/individuals:
 *   post:
 *     summary: Create a new individual profile
 *     tags: [Individuals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - gender
 *               - ageGroup
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               ageGroup:
 *                 type: string
 *                 enum: ["3-5", "6-9", "10-12", "13+"]
 *               avatar:
 *                 type: string
 *     responses:
 *       201:
 *         description: Individual created successfully
 */
router.post("/individuals", individualValidation, createIndividual);

/**
 * @swagger
 * /users/individuals/{id}:
 *   patch:
 *     summary: Update an individual
 *     tags: [Individuals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Individual ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Individual updated successfully
 */
router.patch("/individuals/:id", individualValidation, updateIndividual);

/**
 * @swagger
 * /users/individuals/{id}:
 *   delete:
 *     summary: Delete an individual
 *     tags: [Individuals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Individual deleted successfully
 */
router.delete("/individuals/:id", deleteIndividual);

module.exports = router;
