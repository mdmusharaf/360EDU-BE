// src/modules/search/search.routes.js
//
// 3 routes only — no duplication with /activities or /plans
//
//   GET /search                    PUBLIC   — cross-model search (home page bar)
//   GET /search/feed               PROTECTED — personalized activity feed
//   GET /search/recommended-plans  PROTECTED — plan recommendations
//
// For activity filtering with all params → use GET /activities (already built)
// For plan filtering                     → use GET /plans (already built)

const express = require("express");
const router = express.Router();

const {
  basicSearch,
  getPersonalizedFeed,
  getRecommendedPlans,
} = require("./search.controller");
const {
  basicSearchValidation,
  feedValidation,
} = require("./search.validation");
const { verifyJWT } = require("../../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   - name: Search
 *     description: |
 *       Cross-model search and personalized discovery.
 *       For filtering activities use GET /activities.
 *       For filtering plans use GET /plans.
 */

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Home page search — activities, plans, or both
 *     description: |
 *       The only endpoint that searches across both models in one call.
 *       Frontend sends `type` from the search bar dropdown.
 *       For activity-only filtering with all params, use `GET /activities` instead.
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         example: رمضان
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [activities, plans, all], default: all }
 *         description: Sent by frontend search dropdown
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, maximum: 50 }
 *     responses:
 *       200:
 *         description: Search results (shape depends on type param)
 *       400:
 *         description: Missing query or invalid type
 */
router.get("/", basicSearchValidation, basicSearch);

/**
 * @swagger
 * /search/feed:
 *   get:
 *     summary: Personalized activity feed
 *     description: |
 *       Activities matched to the member's saved `interestAgeGroups` + `interestFields`.
 *       Excludes already-completed activities.
 *       Falls back to popular activities if no interests are set.
 *       Interests come from `req.user` (DB fetch via token) — never from URL params.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Personalized feed
 *         content:
 *           application/json:
 *             examples:
 *               With interests:
 *                 value:
 *                   data:
 *                     feed: []
 *                     basedOn: { ageGroups: ["6-9"], fields: ["Imany"] }
 *               No interests:
 *                 value:
 *                   data:
 *                     feed: []
 *                     basedOn: null
 *                     tip: "Set your interests in profile settings to get a personalized feed."
 *       401:
 *         description: Not logged in
 */
router.get("/feed", verifyJWT, feedValidation, getPersonalizedFeed);

/**
 * @swagger
 * /search/recommended-plans:
 *   get:
 *     summary: Recommended plans based on member interests
 *     description: |
 *       Plans matching member's `interestAgeGroups`. Excludes already-enrolled plans.
 *       Returns up to 8 plans sorted by rating and popularity.
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended plans
 *       401:
 *         description: Not logged in
 */
router.get(
  "/recommended-plans",
  verifyJWT,
  feedValidation,
  getRecommendedPlans,
);

module.exports = router;
