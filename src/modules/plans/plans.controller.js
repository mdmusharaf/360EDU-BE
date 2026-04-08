const { validationResult } = require("express-validator");
const Plan = require("../../models/plan.model");
const Activity = require("../../models/activities.model");
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

const getPlans = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    search,
    ageGroup,
    category,
    season,
    sort = "newest",
    page = 1,
    limit = 12,
  } = req.query;

  // ── Build filter ─────────────────────────────────────────────────────────
  const filter = {
    isPublished: true,
    isCustom: false, // only platform plans on public listing
  };

  if (ageGroup) filter.ageGroup = ageGroup;
  if (category) filter.category = category;
  if (season) filter.season = season;
  if (search) filter.$text = { $search: search };

  // ── Sort ─────────────────────────────────────────────────────────────────
  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    rating: { ratingAverage: -1 },
    favorites: { favoritesCount: -1 },
  };

  const sortQuery = search
    ? { score: { $meta: "textScore" }, ...sortOptions[sort] }
    : sortOptions[sort] || sortOptions.newest;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [plans, total] = await Promise.all([
    Plan.find(filter)
      .select(
        "name image ageGroup category season ratingAverage ratingCount favoritesCount activities",
      )
      .sort(sortQuery)
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

  const totalPages = Math.ceil(total / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        plans: plansWithCount,
        totalPlans: total, // Image 1: "Total registered plans 67"
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
      "Plans fetched successfully",
    ),
  );
});

const getPlanById = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({
    _id: req.params.id,
    isPublished: true,
  }).populate(
    "activities.activity",
    "name image ageGroup timeRequired ratingAverage ratingCount",
  );

  if (!plan) throw new ApiError(404, "Plan not found");

  const userId = req.user._id; // from token

  const isFavorited = plan.favoritedBy.some(
    (id) => id.toString() === userId.toString(),
  );

  const enrollment = plan.enrollments.find(
    (e) => e.user?.toString() === userId.toString(),
  );

  const planData = plan.toObject();

  planData.activities = planData.activities.sort((a, b) => a.order - b.order);

  planData.activitiesCount = planData.activities.length;
  planData.isFavorited = isFavorited;
  planData.isEnrolled = !!enrollment;
  planData.enrollmentProgress = enrollment || null;

  delete planData.enrollments;
  delete planData.favoritedBy;

  return res
    .status(200)
    .json(
      new ApiResponse(200, { plan: planData }, "Plan fetched successfully"),
    );
});

const getMyPlans = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const enrolledPlans = await Plan.find({
    isCustom: false,
    "enrollments.user": userId,
  })
    .select(
      "name image ageGroup category season ratingAverage activities enrollments",
    )
    .lean();

  const enrolledWithProgress = enrolledPlans.map((plan) => {
    const myEnrollment = plan.enrollments.find(
      (e) => e.user?.toString() === userId.toString(),
    );
    return {
      _id: plan._id,
      name: plan.name,
      image: plan.image,
      ageGroup: plan.ageGroup,
      category: plan.category,
      season: plan.season,
      ratingAverage: plan.ratingAverage,
      activitiesCount: plan.activities?.length || 0,
      enrollment: myEnrollment,
    };
  });

  const customPlans = await Plan.find({
    isCustom: true,
    createdBy: userId,
  })
    .select("name image ageGroup category activities assignedTo createdAt")
    .populate("assignedTo", "name ageGroup avatar")
    .lean();

  const customWithCount = customPlans.map((plan) => ({
    ...plan,
    activitiesCount: plan.activities?.length || 0,
    activities: undefined,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        enrolledPlans: enrolledWithProgress,
        customPlans: customWithCount,
      },
      "My plans fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CREATE PLAN  —  POST /api/plans
// ADMIN only
// ═══════════════════════════════════════════════════════════════════════════════

const createPlan = asyncHandler(async (req, res) => {
  console.log("Request body:", req.body);
  handleValidationErrors(req);

  const {
    name,
    image,
    ageGroup,
    category,
    season,
    fields,
    summary,
    description,
    activities,
    publishDate,
  } = req.body;

  if (activities?.length) {
    const ids = activities.map((a) => a.activityId);
    const found = await Activity.find({ _id: { $in: ids }, status: "live" })
      .select("_id")
      .lean();

    if (found.length !== ids.length) {
      throw new ApiError(
        400,
        "One or more activity IDs are invalid or not live",
      );
    }
  }

  const plan = await Plan.create({
    name,
    image: image || "",
    ageGroup,
    category: category || "General",
    season: season || "All year",
    fields: fields || [],
    summary: summary || "",
    description: description || "",
    activities: (activities || []).map((a) => ({
      activity: a.activityId,
      order: a.order,
      stageLabel: a.stageLabel || "",
    })),
    publishDate: publishDate ? new Date(publishDate) : new Date(),
    isPublished: true,
    isCustom: false,
    createdBy: null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { plan }, "Plan created successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN UPDATE PLAN  —  PATCH /api/plans/:id
// ADMIN only
// ═══════════════════════════════════════════════════════════════════════════════

const updatePlan = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const allowed = [
    "name",
    "image",
    "ageGroup",
    "category",
    "season",
    "fields",
    "summary",
    "description",
    "activities",
    "publishDate",
    "hideDate",
    "isPublished",
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowed.includes(key)) updates[key] = req.body[key];
  });

  if (updates.activities?.length) {
    const ids = updates.activities.map((a) => a.activityId || a.activity);
    const found = await Activity.find({ _id: { $in: ids }, status: "live" })
      .select("_id")
      .lean();

    if (found.length !== ids.length) {
      throw new ApiError(
        400,
        "One or more activity IDs are invalid or not live",
      );
    }

    updates.activities = updates.activities.map((a) => ({
      activity: a.activityId || a.activity,
      order: a.order,
      stageLabel: a.stageLabel || "",
    }));
  }

  const plan = await Plan.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!plan) throw new ApiError(404, "Plan not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { plan }, "Plan updated successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DELETE PLAN  —  DELETE /api/plans/:id
// ADMIN only
// ═══════════════════════════════════════════════════════════════════════════════

const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) throw new ApiError(404, "Plan not found");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Plan deleted successfully"));
});

const enrollInPlan = asyncHandler(async (req, res) => {
  const { individualId } = req.body;
  const userId = req.user._id; // from token — never from body or URL

  const plan = await Plan.findOne({
    _id: req.params.id,
    isPublished: true,
    isCustom: false,
  });

  if (!plan) throw new ApiError(404, "Plan not found");

  const alreadyEnrolled = plan.enrollments.some((e) => {
    if (individualId) return e.individual?.toString() === individualId;
    return e.user?.toString() === userId.toString() && !e.individual;
  });

  if (alreadyEnrolled) {
    throw new ApiError(
      409,
      individualId
        ? "This individual is already enrolled in this plan"
        : "You are already enrolled in this plan",
    );
  }

  const activityProgress = plan.activities.map((item) => ({
    activity: item.activity,
    isCompleted: false,
    completedAt: null,
  }));

  plan.enrollments.push({
    user: userId,
    individual: individualId || null,
    activityProgress,
    isCompleted: false,
    completedAt: null,
    enrolledAt: new Date(),
  });

  await plan.save({ validateBeforeSave: false });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Plan added to your profile successfully"));
});

const completeActivityInPlan = asyncHandler(async (req, res) => {
  const userId = req.user._id; // from token
  console.log(userId);
  const plan = await Plan.findById(req.params.id);
  console.log(plan);
  if (!plan) throw new ApiError(404, "Plan not found");

  // Find this user's enrollment record
  const individualId =
    req.body.individualId && req.body.individualId !== ""
      ? req.body.individualId
      : null;
  const enrollmentIndex = plan.enrollments.findIndex((e) => {
    if (individualId) {
      return e.individual?.toString() === individualId.toString();
    }

    return e.user?.toString() === userId.toString();
  });

  if (enrollmentIndex === -1) {
    throw new ApiError(
      400,
      "You are not enrolled in this plan. Add it to your profile first.",
    );
  }

  const enrollment = plan.enrollments[enrollmentIndex];

  // Find the activity in this enrollment's progress tracker
  const progressIndex = enrollment.activityProgress.findIndex(
    (p) => p.activity?.toString() === req.params.activityId,
  );

  if (progressIndex === -1) {
    throw new ApiError(404, "Activity not found in this plan");
  }

  if (enrollment.activityProgress[progressIndex].isCompleted) {
    throw new ApiError(
      409,
      "Activity already marked as completed in this plan",
    );
  }

  const now = new Date();

  // Mark this specific activity as complete
  plan.enrollments[enrollmentIndex].activityProgress[
    progressIndex
  ].isCompleted = true;
  plan.enrollments[enrollmentIndex].activityProgress[
    progressIndex
  ].completedAt = now;

  // Check if ALL activities in this enrollment are now complete
  const allDone = plan.enrollments[enrollmentIndex].activityProgress.every(
    (p) => p.isCompleted,
  );

  if (allDone) {
    plan.enrollments[enrollmentIndex].isCompleted = true;
    plan.enrollments[enrollmentIndex].completedAt = now;
  }

  plan.markModified("enrollments");
  await plan.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activityCompleted: true,
        planCompleted: allDone,
        completedAt: now,
      },
      allDone
        ? "Activity completed! You have finished this plan!"
        : "Activity marked as completed",
    ),
  );
});

const createCustomPlan = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { name, ageGroup, activities, individualId } = req.body;

  if (activities?.length) {
    const ids = activities.map((a) => a.activityId);
    const found = await Activity.find({ _id: { $in: ids }, status: "live" })
      .select("_id")
      .lean();

    if (found.length !== ids.length) {
      throw new ApiError(
        400,
        "One or more activity IDs are invalid or not live",
      );
    }
  }

  const plan = await Plan.create({
    name,
    ageGroup,
    activities: (activities || []).map((a) => ({
      activity: a.activityId,
      order: a.order,
      stageLabel: a.stageLabel || "",
    })),
    isCustom: true,
    createdBy: req.user._id,
    assignedTo: individualId || null,
    isPublished: false,
    category: "General",
    season: "All year",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { plan }, "Custom plan created successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE FAVORITE  —  POST /api/plans/:id/favorite
// PROTECTED — logged-in member
// ═══════════════════════════════════════════════════════════════════════════════

const toggleFavorite = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw new ApiError(404, "Plan not found");

  const userId = req.user._id; // from token
  const alreadyFavorited = plan.favoritedBy.some(
    (id) => id.toString() === userId.toString(),
  );

  if (alreadyFavorited) {
    plan.favoritedBy.pull(userId);
    plan.favoritesCount = Math.max(0, plan.favoritesCount - 1);
  } else {
    plan.favoritedBy.push(userId);
    plan.favoritesCount += 1;
  }

  await plan.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isFavorited: !alreadyFavorited,
        favoritesCount: plan.favoritesCount,
      },
      alreadyFavorited ? "Removed from favorites" : "Added to favorites",
    ),
  );
});

module.exports = {
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
};
