// src/modules/activities/activities.controller.js
//
// ONLY GET endpoints for now:
//
//   GET /api/activities        — list (PUBLIC — guests can browse)
//   GET /api/activities/:id    — detail (PROTECTED — must be logged in)
//
// WHY IS LIST PUBLIC BUT DETAIL PROTECTED?
// From requirements: guests can search and see activities on the home page.
// If they want full details → they must login first.

const { validationResult } = require("express-validator");
const Activity = require("../../models/activities.model");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// ─── Shared validation error handler ──────────────────────────────────────────
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
// GET ALL ACTIVITIES  —  GET /api/activities
// PUBLIC — no login needed
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is what powers the home page list + advanced search.
//
// SUPPORTED QUERY PARAMS:
//   ?search=keyword
//   ?ageGroup=3-6
//   ?field=Family and social
//   ?gender=everyone
//   ?location=closed
//   ?groupSize=small group
//   ?method=Story
//   ?sort=newest | oldest | rating | favorites
//   ?page=1&limit=12
//
// EXAMPLE REQUESTS:
//   GET /api/activities
//   GET /api/activities?ageGroup=6-9&sort=rating
//   GET /api/activities?search=مهنة&page=2
//
// WHAT THE RESPONSE LOOKS LIKE:
// {
//   "success": true,
//   "data": {
//     "activities": [ { name, image, ageGroup, field, timeRequired, ratingAverage, favoritesCount } ],
//     "pagination": { total, page, totalPages, hasNextPage, hasPrevPage }
//   }
// }
//
// NOTE: We only return the fields the LIST CARD needs — not the full document.
// The full document (steps, comments, attachments etc.) is only returned in getActivityById.
// This keeps the list response small and fast.

const getActivities = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    search,
    ageGroup,
    field,
    gender,
    location,
    groupSize,
    method,
    sort = "newest",
    page = 1,
    limit = 12,
  } = req.query;

  // ── STEP 1: Build the filter object ─────────────────────────────────────
  //
  // We always filter for status:"live" + isPublished:true — these are the only
  // activities guests should ever see.
  //
  // Then we add extra filters IF the client sent them.
  // Using the spread operator: ...(condition && { key: value })
  // means the key is only added to the object if condition is truthy.

  const filter = {
    status: "live",
    isPublished: true,
  };

  if (ageGroup) filter.ageGroup = ageGroup;
  if (field) filter.field = field;
  if (gender) filter.gender = gender;
  if (groupSize) filter.groupSize = groupSize;

  // Location needs special handling because "both" means open AND closed
  // If user filters for "closed", we want to include activities marked "both" as well
  if (location && location !== "both") {
    filter.location = { $in: [location, "both"] };
  }

  // Method filter — activity.method is an array so $in checks if any value matches
  if (method) {
    filter.method = { $in: [method] };
  }

  // Full-text search — uses the text index we defined on name + description
  // MongoDB text search understands Arabic text as well
  if (search) {
    filter.$text = { $search: search };
  }

  // ── STEP 2: Build the sort object ───────────────────────────────────────
  //
  // When doing text search, MongoDB scores each result by relevance.
  // We sort by that score FIRST, then by the user's chosen sort.

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    rating: { ratingAverage: -1 },
    favorites: { favoritesCount: -1 },
  };

  const sortQuery = search
    ? { score: { $meta: "textScore" }, ...sortOptions[sort] }
    : sortOptions[sort] || sortOptions.newest;

  // ── STEP 3: Pagination math ──────────────────────────────────────────────
  //
  // Page 1: skip 0,  take 12
  // Page 2: skip 12, take 12
  // Page 3: skip 24, take 12
  //
  // skip = (page - 1) * limit

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit)); // hard cap at 50
  const skip = (pageNum - 1) * limitNum;

  // ── STEP 4: Run the DB queries ───────────────────────────────────────────
  //
  // We run TWO queries at the SAME TIME using Promise.all.
  //
  // WHY TWO QUERIES?
  //   - One to get the actual documents (with skip + limit)
  //   - One to count the TOTAL matching documents (for pagination math)
  //
  // WHY PARALLEL (Promise.all)?
  //   Running them sequentially would take 2x the time.
  //   Promise.all runs both simultaneously — much faster.
  //
  // .lean() — returns plain JS objects instead of full Mongoose documents.
  // Mongoose documents carry a lot of extra overhead (methods, virtuals etc.)
  // For reading data we don't need any of that — .lean() is faster.
  //
  // .select() — only return the fields the list card UI actually uses.
  // No steps, no comments, no completions — those are only needed on the detail page.

  const [activities, total] = await Promise.all([
    Activity.find(filter)
      .select(
        "name description image ageGroup field timeRequired ratingAverage ratingCount favoritesCount",
      )
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Activity.countDocuments(filter),
  ]);

  // ── STEP 5: Build pagination metadata ───────────────────────────────────
  const totalPages = Math.ceil(total / limitNum);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        activities,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
      "Activities fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET SINGLE ACTIVITY  —  GET /api/activities/:id
// PROTECTED — must be logged in
// ═══════════════════════════════════════════════════════════════════════════════
//
// Returns the FULL activity document including:
//   - All classification fields
//   - Numbered steps
//   - Downloadable attachments
//   - Approved comments with commenter info
//   - Similar activities (same ageGroup + field)
//
// req.user is available here because verifyJWT runs before this controller.
// We use it to check if this user has already favorited this activity —
// so the frontend can show a filled or empty heart icon.
//
// WHAT THE RESPONSE LOOKS LIKE:
// {
//   "data": {
//     "activity": { ...full activity, isFavorited: true/false },
//     "similar":  [ { name, image, ageGroup, field, timeRequired, ratingAverage } ]
//   }
// }

const getActivityById = asyncHandler(async (req, res) => {
  // Find only LIVE + published activities
  // .populate() replaces the user ObjectId in comments with the actual user document
  // We only pull username + avatar — no sensitive fields
  const activity = await Activity.findOne({
    _id: req.params.id,
    status: "live",
    isPublished: true,
  })
    .populate("submittedBy", "username avatar")
    .populate("comments.user", "username avatar");

  if (!activity) throw new ApiError(404, "Activity not found");

  // ── Only show approved comments ──────────────────────────────────────────
  // The stored comments array includes both approved and pending.
  // We filter to only return approved ones to the client.
  const approvedComments = activity.comments.filter((c) => c.isApproved);

  // ── Has the logged-in user favorited this? ───────────────────────────────
  // req.user._id comes from verifyJWT middleware
  const isFavorited = activity.favoritedBy.some(
    (id) => id.toString() === req.user._id.toString(),
  );

  // ── Has the logged-in user completed this? ──────────────────────────────
  const isCompleted = activity.completions.some(
    (c) => c.user?.toString() === req.user._id.toString(),
  );

  // ── Similar activities ───────────────────────────────────────────────────
  // Same ageGroup + field, exclude the current one, limit to 4
  //   const similar = await Activity.find({
  //     _id: { $ne: activity._id }, // $ne = not equal
  //     ageGroup: activity.ageGroup,
  //     field: activity.field,
  //     status: "live",
  //     isPublished: true,
  //   })
  //     .select(
  //       "name image ageGroup field timeRequired ratingAverage favoritesCount",
  //     )
  //     .limit(4)
  //     .lean();

  // ── Build the response ───────────────────────────────────────────────────
  // We use .toObject() to convert the Mongoose document to a plain JS object
  // so we can spread it and add extra fields (isFavorited, isCompleted)
  const activityData = {
    ...activity.toObject(),
    comments: approvedComments, // override with filtered list
    isFavorited,
    isCompleted,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { activity: activityData },
        "Activity fetched successfully",
      ),
    );
});

module.exports = { getActivities, getActivityById };

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE ACTIVITY  —  POST /api/activities
// ADMIN only (superadmin or supervisor with "activities.add" permission)
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is how the admin panel adds a new activity directly.
// Status is set to "live" immediately — no approval needed.
// submittedBy is null — meaning it was created by admin, not suggested by a member.
//
// REQUEST BODY:
// {
//   "name": "Profession and tools",
//   "description": "This activity contributes to improving...",
//   "ageGroup": "3-6",
//   "field": "Family and social",
//   "timeRequired": 30,
//   "gender": "everyone",
//   "location": "both",
//   "groupSize": "small group",
//   "method": ["Mental/Thinking", "Practical/Performance"],
//   "steps": ["The educator explains...", "The educator divides..."],
//   "attachments": [{ "label": "Profession and tools", "url": "https://..." }],
//   "image": "https://cloudinary.com/..."
// }

const createActivity = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    name,
    description,
    image,
    ageGroup,
    field,
    gender,
    location,
    timeRequired,
    groupSize,
    method,
    steps,
    attachments,
    publishDate,
  } = req.body;

  const activity = await Activity.create({
    name,
    description,
    image: image || "",
    ageGroup,
    field,
    gender: gender || "everyone",
    location: location || "both",
    timeRequired,
    groupSize: groupSize || "small group",
    method: method || [],
    steps: steps || [],
    attachments: attachments || [],
    publishDate: publishDate ? new Date(publishDate) : new Date(),
    status: "live", // admin created = live immediately
    isPublished: true,
    submittedBy: null, // null = created by admin directly
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { activity }, "Activity created successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER SUBMIT ACTIVITY  —  POST /api/activities/submit
// PROTECTED — any logged-in member can suggest an activity
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is the member's "Add Activity Proposal" feature from the requirements.
// Difference from admin create:
//   - status is always "pending"  (not live)
//   - isPublished is false         (not visible publicly)
//   - submittedBy = req.user._id   (we know who submitted it)
//
// The activity goes through the approval workflow:
//   pending → admin reviews → approved (live) or rejected
//
// Member can see their submissions with status badges in "My Activities" section.

const submitActivity = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    name,
    description,
    image,
    ageGroup,
    field,
    gender,
    location,
    timeRequired,
    groupSize,
    method,
    steps,
    attachments,
  } = req.body;

  const activity = await Activity.create({
    name,
    description,
    image: image || "",
    ageGroup,
    field,
    gender: gender || "everyone",
    location: location || "both",
    timeRequired,
    groupSize: groupSize || "small group",
    method: method || [],
    steps: steps || [],
    attachments: attachments || [],
    status: "pending", // always pending for member submissions
    isPublished: false, // not visible until approved
    submittedBy: req.user._id, // track who submitted it
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { activity },
        "Activity submitted successfully. It will be reviewed by our team.",
      ),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW ACTIVITY  —  PATCH /api/activities/:id/review
// ADMIN only — approve or reject a member-submitted activity
// ═══════════════════════════════════════════════════════════════════════════════
//
// When a member submits an activity it sits in "pending" status.
// Admin opens the submission in the panel, reviews it, and either:
//   - Approves it   → status becomes "live", publishDate is set to now
//   - Rejects it    → status becomes "rejected", rejectionReason is stored
//
// The member sees the updated status badge in "My Activities" list.
//
// REQUEST BODY:
//   { "status": "approved" }
//   { "status": "rejected", "rejectionReason": "Content is not suitable" }

const reviewActivity = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { status, rejectionReason } = req.body;

  const activity = await Activity.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status: status === "approved" ? "live" : "rejected",
        isPublished: status === "approved",
        // set publishDate only when approving
        ...(status === "approved" && { publishDate: new Date() }),
        // set rejection reason only when rejecting
        ...(status === "rejected" && rejectionReason && { rejectionReason }),
      },
    },
    { new: true }, // return the updated document
  );

  if (!activity) throw new ApiError(404, "Activity not found");

  // TODO: send notification to activity.submittedBy when notifications module is built

  return res
    .status(200)
    .json(
      new ApiResponse(200, { activity }, `Activity ${status} successfully`),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET MY SUBMISSIONS  —  GET /api/activities/my-submissions
// PROTECTED — member sees their own submitted activities with status badges
// ═══════════════════════════════════════════════════════════════════════════════
//
// Powers the "My Activities" section in the member dashboard.
// Shows pending/approved/rejected badges.
// Only returns the current user's submissions — never other users'.

const getMySubmissions = asyncHandler(async (req, res) => {
  const activities = await Activity.find({ submittedBy: req.user._id })
    .select("name image ageGroup field status rejectionReason createdAt")
    .sort({ createdAt: -1 }); // newest first

  return res
    .status(200)
    .json(
      new ApiResponse(200, { activities }, "Submissions fetched successfully"),
    );
});

module.exports = {
  getActivities,
  getActivityById,
  createActivity,
  submitActivity,
  reviewActivity,
  getMySubmissions,
};
