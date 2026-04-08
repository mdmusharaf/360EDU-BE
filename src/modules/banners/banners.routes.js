// src/modules/content/banners.routes.js

const express = require("express");
const router = express.Router();

const {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBanner,
  deleteBanner,
} = require("./banners.controller");

const {
  createBannerValidation,
  updateBannerValidation,
  getBannersValidation,
} = require("./banners.validation");

const { verifyJWT, authorize } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Banners — Public
 *     description: Active banners for the frontend to render.
 *   - name: Banners — Admin
 *     description: Superadmin manages banners — create, edit, schedule, toggle.
 */

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Get active banners for a section
 *     description: |
 *       Public endpoint. Returns only active, non-expired banners for the requested section.
 *       Automatically filters by audience:
 *       - Guest (not logged in) → sees `all` and `guest` banners
 *       - Member (logged in)    → sees `all` and `member` banners
 *     tags: [Banners — Public]
 *     parameters:
 *       - in: query
 *         name: section
 *         schema:
 *           type: string
 *           enum: [home_top]
 *           default: home_top
 *         description: Which section to fetch banners for
 *     responses:
 *       200:
 *         description: Active banners sorted by order
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 banners:
 *                   - _id: "64abc123"
 *                     title: "Ramadan Special"
 *                     image: "https://cloudinary.com/banner.jpg"
 *                     linkType: "internal"
 *                     linkUrl: "/plans?category=Ramadan"
 *                     order: 1
 */
router.get("/", getBannersValidation, getBanners);

// ── Admin routes ───────────────────────────────────────────────────────────────
router.use(verifyJWT, authorize("superadmin"));

/**
 * @swagger
 * /admin/banners/all:
 *   get:
 *     summary: Get all banners including inactive (Admin)
 *     description: Full list for admin management — includes inactive and expired banners.
 *     tags: [Banners — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: section
 *         schema: { type: string, enum: [home_top] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: All banners
 */
router.get("/all", getBannersValidation, getAllBanners);

/**
 * @swagger
 * /admin/banners:
 *   post:
 *     summary: Create a banner (Admin)
 *     description: |
 *       Creates a new banner. Set `startDate` and `endDate` for automatic scheduling.
 *       The banner shows only when: `isActive=true` AND within the date range.
 *     tags: [Banners — Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, image]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Ramadan Special Activities
 *               image:
 *                 type: string
 *                 description: Cloudinary URL
 *                 example: https://cloudinary.com/banner.jpg
 *               section:
 *                 type: string
 *                 enum: [home_top]
 *                 default: home_top
 *               linkType:
 *                 type: string
 *                 enum: [internal, external, none]
 *                 default: none
 *               linkUrl:
 *                 type: string
 *                 example: /plans?category=Ramadan
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-10"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-04-10"
 *               order:
 *                 type: integer
 *                 default: 1
 *                 description: Display order — lower = shows first
 *               targetAudience:
 *                 type: string
 *                 enum: [all, guest, member]
 *                 default: all
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Banner created
 *       400:
 *         description: Validation error
 */
router.post("/", createBannerValidation, createBanner);

/**
 * @swagger
 * /admin/banners/{id}:
 *   patch:
 *     summary: Update a banner (Admin)
 *     description: Update any banner field. Only send the fields you want to change.
 *     tags: [Banners — Admin]
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
 *             title: "Updated Banner Title"
 *             endDate: "2024-05-01"
 *             isActive: false
 *     responses:
 *       200:
 *         description: Banner updated
 *       404:
 *         description: Banner not found
 */
router.patch("/:id", updateBannerValidation, updateBanner);

/**
 * @swagger
 * /admin/banners/{id}/toggle:
 *   patch:
 *     summary: Toggle banner active status (Admin)
 *     description: Quick on/off switch without opening the full edit form.
 *     tags: [Banners — Admin]
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
 *             examples:
 *               Activated:
 *                 value: { success: true, message: "Banner activated successfully", data: { isActive: true } }
 *               Deactivated:
 *                 value: { success: true, message: "Banner deactivated successfully", data: { isActive: false } }
 */
router.patch("/:id/toggle", toggleBanner);

/**
 * @swagger
 * /admin/banners/{id}:
 *   delete:
 *     summary: Delete a banner (Admin)
 *     tags: [Banners — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Banner deleted
 *       404:
 *         description: Banner not found
 */
router.delete("/:id", deleteBanner);

module.exports = router;
