// src/modules/content/staticPages.routes.js
//
// PUBLIC routes  → mounted at /pages in app.js
// ADMIN routes   → mounted at /admin/pages in app.js (protected by superadmin)

const express = require("express");
const router = express.Router();

const {
  getPage,
  getAllPages,
  getPageForEdit,
  updatePage,
} = require("./staticPages.controller");

const { updatePageValidation } = require("./staticPages.validation");
const { verifyJWT, authorize } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Pages — Public
 *     description: Static page content for the frontend to render.
 *   - name: Pages — Admin
 *     description: Superadmin manages page content via rich text editor.
 */

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /pages/{slug}:
 *   get:
 *     summary: Get static page content
 *     description: |
 *       Public endpoint. Returns the HTML content of a static page.
 *       Frontend renders with `dangerouslySetInnerHTML`.
 *       Content is pre-sanitized on save — safe to render directly.
 *     tags: [Pages — Public]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           enum: [about-platform, privacy-policy, registration-terms, activity-submission-terms, contact-info]
 *         example: about-platform
 *     responses:
 *       200:
 *         description: Page content
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 page:
 *                   slug: about-platform
 *                   title: About the Platform
 *                   content: "<h1>About 360 Education</h1><p>...</p>"
 *                   metaTitle: About 360 Education
 *                   metaDescription: Learn about the platform
 *                   isPublished: true
 *                   updatedAt: "2024-01-15T10:30:00Z"
 *       404:
 *         description: Page not found or not published
 */
router.get("/:slug", getPage);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN routes — apply superadmin auth to all below
// ─────────────────────────────────────────────────────────────────────────────

router.use(verifyJWT, authorize("superadmin"));

/**
 * @swagger
 * /pages:
 *   get:
 *     summary: List all static pages (Admin)
 *     description: Returns all pages with metadata only — no full HTML content. Used for admin panel sidebar navigation.
 *     tags: [Pages — Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All pages metadata
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 pages:
 *                   - slug: about-platform
 *                     title: About the Platform
 *                     isPublished: true
 *                     updatedAt: "2024-01-15T10:30:00Z"
 *                     lastEditedBy: { username: "Super Admin" }
 */
router.get("/", getAllPages);

/**
 * @swagger
 * /admin/pages/{slug}:
 *   get:
 *     summary: Get single page for editing (Admin)
 *     description: Returns the full page including HTML content — loads into the rich text editor.
 *     tags: [Pages — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           enum: [about-platform, privacy-policy, registration-terms, activity-submission-terms, contact-info]
 *     responses:
 *       200:
 *         description: Full page with HTML content
 *       404:
 *         description: Page not found
 */
router.get("/:slug", getPageForEdit);

/**
 * @swagger
 * /admin/pages/{slug}:
 *   patch:
 *     summary: Update page content (Admin)
 *     description: |
 *       Admin saves HTML from the rich text editor.
 *       HTML is sanitized on the backend before storing:
 *       - `<script>` tags stripped
 *       - Event handlers (onclick etc.) stripped
 *       - Standard formatting tags allowed (h1-h6, p, ul, ol, a, img etc.)
 *       - Arabic RTL `dir` attribute allowed
 *       `lastEditedBy` is set automatically from the JWT token.
 *     tags: [Pages — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           enum: [about-platform, privacy-policy, registration-terms, activity-submission-terms, contact-info]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Raw HTML from the rich text editor
 *                 example: "<h1>About 360 Education</h1><p>Platform description...</p>"
 *               metaTitle:
 *                 type: string
 *                 maxLength: 100
 *                 example: "About 360 Education"
 *               metaDescription:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Learn about the 360 Education platform"
 *               isPublished:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Page updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Page updated successfully
 *               data:
 *                 page:
 *                   slug: about-platform
 *                   title: About the Platform
 *                   content: "<h1>About 360 Education</h1><p>...</p>"
 *                   lastEditedBy: { username: "Super Admin" }
 *                   updatedAt: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Page not found
 */
router.patch("/:slug", updatePageValidation, updatePage);

module.exports = router;
