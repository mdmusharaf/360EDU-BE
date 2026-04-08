// src/modules/search/search.controller.js
//
// WHY THIS MODULE EXISTS (and what it does NOT duplicate):
//
//   GET /api/activities          → already handles activity filtering + keyword search
//   GET /api/plans               → already handles plan listing + filtering
//
// This module only contains what those two CANNOT do:
//
//   1. GET /api/search?q=&type=
//      Cross-model search — searches activities AND plans together in one call.
//      Needed for the home page search bar where user picks what to search.
//
//   2. GET /api/search/feed
//      Personalized feed — uses member's interestAgeGroups + interestFields,
//      excludes already-completed activities. Cannot live in activities module
//      because it's member-state-aware, not a simple filter.
//
//   3. GET /api/search/recommended-plans
//      Plan recommendations — based on member interests, excludes enrolled plans.
//      Cannot live in plans module for the same reason.

const { validationResult } = require("express-validator");
const Activity = require("../../models/activities.model");
const Plan = require("../../models/plan.model");
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
// BASIC SEARCH  —  GET /api/search?q=keyword&type=activities|plans|all
// PUBLIC — home page search bar
// ═══════════════════════════════════════════════════════════════════════════════
//
// The only endpoint that searches across BOTH models simultaneously.
// Frontend sends `type` based on the search bar dropdown selection.
//
// type=activities → activities only
// type=plans      → plans only
// type=all        → both (default)

const basicSearch = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { q, type = "all", limit = 12, page = 1 } = req.query;

  if (!q || q.trim().length === 0)
    throw new ApiError(400, "Search query is required");

  if (!["activities", "plans", "all"].includes(type))
    throw new ApiError(400, "type must be one of: activities, plans, all");

  const limitNum = Math.min(50, parseInt(limit));
  const pageNum = Math.max(1, parseInt(page));
  const skip = (pageNum - 1) * limitNum;
  const textFilter = { $text: { $search: q.trim() } };
  const textSort = { score: { $meta: "textScore" } };

  // ── type=activities ────────────────────────────────────────────────────
  if (type === "activities") {
    const filter = { ...textFilter, status: "live", isPublished: true };
    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .select(
          "name description image ageGroup field timeRequired ratingAverage favoritesCount",
        )
        .sort(textSort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Activity.countDocuments(filter),
    ]);
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          type,
          query: q,
          activities,
          pagination: {
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1,
          },
        },
        "Search results fetched successfully",
      ),
    );
  }

  // ── type=plans ─────────────────────────────────────────────────────────
  if (type === "plans") {
    const filter = { ...textFilter, isCustom: false, isPublished: true };
    const [plans, total] = await Promise.all([
      Plan.find(filter)
        .select(
          "name image ageGroup category season ratingAverage activities favoritesCount",
        )
        .sort(textSort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Plan.countDocuments(filter),
    ]);
    const plansWithCount = plans.map((p) => ({
      ...p,
      activitiesCount: p.activities?.length || 0,
      activities: undefined,
    }));
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          type,
          query: q,
          plans: plansWithCount,
          pagination: {
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1,
          },
        },
        "Search results fetched successfully",
      ),
    );
  }

  // ── type=all ───────────────────────────────────────────────────────────
  const [activities, totalActivities, plans, totalPlans] = await Promise.all([
    Activity.find({ ...textFilter, status: "live", isPublished: true })
      .select(
        "name description image ageGroup field timeRequired ratingAverage favoritesCount",
      )
      .sort(textSort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Activity.countDocuments({
      ...textFilter,
      status: "live",
      isPublished: true,
    }),
    Plan.find({ ...textFilter, isCustom: false, isPublished: true })
      .select(
        "name image ageGroup category season ratingAverage activities favoritesCount",
      )
      .sort(textSort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Plan.countDocuments({ ...textFilter, isCustom: false, isPublished: true }),
  ]);

  const plansWithCount = plans.map((p) => ({
    ...p,
    activitiesCount: p.activities?.length || 0,
    activities: undefined,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        type,
        query: q,
        activities,
        plans: plansWithCount,
        totalActivities,
        totalPlans,
        pagination: {
          page: pageNum,
          hasNextPage:
            pageNum <
            Math.ceil(Math.max(totalActivities, totalPlans) / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
      "Search results fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALIZED FEED  —  GET /api/search/feed
// PROTECTED — uses req.user (full document from DB via verifyJWT)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Cannot live in activities module because it:
//   - reads member's interestAgeGroups + interestFields from req.user
//   - excludes activities the member already completed
//   - falls back to popular if no interests set
//
// This is member-state-aware — not a generic filter.

const getPersonalizedFeed = asyncHandler(async (req, res) => {
  const { interestAgeGroups, interestFields, _id: userId } = req.user;

  // No interests set → fallback to popular
  if (!interestAgeGroups?.length && !interestFields?.length) {
    const popular = await Activity.find({ status: "live", isPublished: true })
      .select(
        "name description image ageGroup field timeRequired ratingAverage favoritesCount",
      )
      .sort({ favoritesCount: -1, ratingAverage: -1 })
      .limit(12)
      .lean();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          feed: popular,
          basedOn: null,
          tip: "Set your interests in profile settings to get a personalized feed.",
        },
        "Feed fetched successfully",
      ),
    );
  }

  // Exclude already completed activities
  const completed = await Activity.find({ "completions.user": userId })
    .select("_id")
    .lean();
  const completedIds = completed.map((a) => a._id);

  const filter = {
    status: "live",
    isPublished: true,
    _id: { $nin: completedIds },
    ...(interestAgeGroups?.length && { ageGroup: { $in: interestAgeGroups } }),
    ...(interestFields?.length && { field: { $in: interestFields } }),
  };

  const { page = 1, limit = 12 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));

  const [feed, total] = await Promise.all([
    Activity.find(filter)
      .select(
        "name description image ageGroup field timeRequired ratingAverage favoritesCount",
      )
      .sort({ ratingAverage: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Activity.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        feed,
        basedOn: { ageGroups: interestAgeGroups, fields: interestFields },
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
          hasNextPage: pageNum < Math.ceil(total / limitNum),
        },
      },
      "Personalized feed fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECOMMENDED PLANS  —  GET /api/search/recommended-plans
// PROTECTED — based on req.user.interestAgeGroups
// ═══════════════════════════════════════════════════════════════════════════════
//
// Cannot live in plans module because it:
//   - reads member's interestAgeGroups from req.user
//   - excludes plans the member is already enrolled in

const getRecommendedPlans = asyncHandler(async (req, res) => {
  const { interestAgeGroups, _id: userId } = req.user;

  const enrolled = await Plan.find({ "enrollments.user": userId })
    .select("_id")
    .lean();
  const enrolledIds = enrolled.map((p) => p._id);

  const filter = {
    isCustom: false,
    isPublished: true,
    _id: { $nin: enrolledIds },
    ...(interestAgeGroups?.length && { ageGroup: { $in: interestAgeGroups } }),
  };

  const plans = await Plan.find(filter)
    .select(
      "name image ageGroup category season ratingAverage activities favoritesCount",
    )
    .sort({ ratingAverage: -1, favoritesCount: -1 })
    .limit(8)
    .lean();

  const plansWithCount = plans.map((p) => ({
    ...p,
    activitiesCount: p.activities?.length || 0,
    activities: undefined,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        plans: plansWithCount,
        basedOn: { ageGroups: interestAgeGroups },
      },
      "Recommended plans fetched successfully",
    ),
  );
});

module.exports = { basicSearch, getPersonalizedFeed, getRecommendedPlans };
