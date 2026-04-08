// src/models/Plan.model.js
//
// Built directly from the 3 screenshots:
//
//   Image 1 — list card:
//     name, image, ageGroup badge, activitiesCount, rating, category tag, favorites
//
//   Image 2 — detail top:
//     name, ageGroup, domain (MULTIPLE fields shown), expectedTime (shows "Ramadan"),
//     plan summary (short), plan description (long)
//
//   Image 3 — detail activities section:
//     ordered list of Activity references with stage labels
//     each activity shows: image, name, stageLabel, ageGroup badge, timeRequired
//
// KEY OBSERVATIONS FROM SCREENSHOTS:
//
//   1. "Domain" shows MULTIPLE fields separated by dashes
//      → field is an ARRAY not a single string (unlike Activity model)
//
//   2. "Expected time: Ramadan" is a SEASON/OCCASION not minutes
//      → plans use a season string (Ramadan, Summer, etc.) not an integer
//
//   3. Image 3 shows activities have a "stage label" like "The first stage", "Stage Two"
//      → this label belongs to the plan-activity relationship, not the Activity itself
//      → stored in the activities array as { activity, order, stageLabel }
//
//   4. "Activities: 16" shown on the card
//      → we store activitiesCount as a virtual (derived from activities.length)
//
//   5. Plan can be PLATFORM plan (created by admin) or CUSTOM plan (created by member)
//      → isCustom: Boolean
//
//   6. Plans can be assigned to a member OR to an Individual (sub-account)
//      → assignedTo stores the Individual._id for custom plans

const mongoose = require("mongoose");
const { ACTIVITY_FIELDS, ACTIVITY_AGE_GROUPS } = require("./activities.model");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Image 2: "Expected time: Ramadan" → plans use seasons/occasions, not minutes
const PLAN_SEASONS = [
  "Ramadan",
  "Summer",
  "Winter",
  "Spring",
  "Autumn",
  "All year",
  "School year",
  "Holidays",
];

// Plan categories shown as colored tags on the card (Image 1: "Ramadan" tag)
const PLAN_CATEGORIES = [
  "Ramadan",
  "General",
  "Seasonal",
  "Family",
  "School",
  "Weekend",
];

// ─── SUB-SCHEMA: Plan Activity Item ───────────────────────────────────────────
//
// Image 3 shows each activity inside a plan has:
//   - A reference to the Activity document
//   - An order number (1st, 2nd, 3rd...)
//   - A stage label ("The first stage", "Stage Two: A role model around me")
//
// WHY NOT JUST AN ARRAY OF ACTIVITY IDs?
// Because the stage label ("The first stage: message from role model") is specific
// to THIS plan — it's not a property of the activity itself.
// The same activity could appear in two different plans with different stage labels.
// So we store the label alongside the reference.

const planActivitySchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },

    // Display order inside the plan (1, 2, 3...)
    // Used to sort activities when rendering Image 3
    order: {
      type: Number,
      required: true,
      min: 1,
    },

    // Image 3: "The first stage: message from role model"
    // This label is per-plan, not per-activity
    stageLabel: {
      type: String,
      trim: true,
      default: "",
    },

    // Has this specific member completed this activity inside this plan?
    // We track per-plan completion separately from the global Activity.completions
    // because the same activity might be in multiple plans
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }, // no separate _id for each item
);

// ─── SUB-SCHEMA: Member Enrollment ────────────────────────────────────────────
//
// When a member adds a platform plan to their profile,
// we create an enrollment record that tracks their progress.
//
// WHY SEPARATE FROM THE PLAN ITSELF?
// The Plan document is shared — 1000 members can enroll in the same plan.
// Each member needs their OWN progress tracking.
// If we stored completions inside the Plan document, it would grow enormous.
//
// Enrollment stores:
//   - who enrolled (user)
//   - optionally who it's for (individual — a child/student)
//   - per-activity completion status (copy of planActivitySchema with completion fields)
//   - overall completion date

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional — if the plan is being followed on behalf of a managed individual
    individual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Individual",
      default: null,
    },

    // Track completion of each activity inside the plan for this enrollee
    activityProgress: [
      {
        activity: { type: mongoose.Schema.Types.ObjectId, ref: "Activity" },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
        _id: false,
      },
    ],

    // Set automatically when all activities in the plan are completed
    // Requirement: "Plan completion date = last activity completion date"
    completedAt: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },

    enrolledAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ─── MAIN PLAN SCHEMA ─────────────────────────────────────────────────────────
const planSchema = new mongoose.Schema(
  {
    // ── Shown on list card (Image 1) ──────────────────────────────────────
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },

    // Cover image — Cloudinary URL
    image: {
      type: String,
      default: "",
    },

    // Image 1: colored ageGroup badge
    ageGroup: {
      type: String,
      required: [true, "Age group is required"],
      enum: ACTIVITY_AGE_GROUPS, // reuse same enum ["3-6","6-9","9-12","12-15"]
    },

    // Image 1: "Ramadan" tag at the bottom of the card
    category: {
      type: String,
      enum: PLAN_CATEGORIES,
      default: "General",
    },

    // ── Detail page (Image 2) ─────────────────────────────────────────────

    // Image 2: "Domain: Family and social - faith - behavioral and moral..."
    // ARRAY — a plan can span multiple fields (unlike activity which has one)
    fields: {
      type: [String],
      default: [],
    },

    // Image 2: "Expected time: Ramadan"
    // This is a season/occasion, not a number of minutes
    season: {
      type: String,
      enum: PLAN_SEASONS,
      default: "All year",
    },

    // Image 2: "Plan summary" — short paragraph shown in the detail top section
    summary: {
      type: String,
      trim: true,
      maxlength: [500, "Summary cannot exceed 500 characters"],
    },

    // Image 2: "Plan description" — longer text below summary
    description: {
      type: String,
      trim: true,
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },

    // ── Activities (Image 3) ──────────────────────────────────────────────
    // Ordered list of activities with their stage labels
    activities: [planActivitySchema],

    // ── Rating ────────────────────────────────────────────────────────────
    // Same pre-calculated approach as Activity model
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingCount: { type: Number, default: 0 },

    // ── Favorites ─────────────────────────────────────────────────────────
    favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    favoritesCount: { type: Number, default: 0 },

    // ── Enrollments ───────────────────────────────────────────────────────
    // Members who added this plan to their profile
    enrollments: [enrollmentSchema],

    // ── Plan Type ─────────────────────────────────────────────────────────
    // false = platform plan (admin created, visible to all)
    // true  = custom plan  (member created, visible only to that member)
    isCustom: {
      type: Boolean,
      default: false,
    },

    // For custom plans — who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // For custom plans — who is it assigned to (optional, can be an individual)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Individual",
      default: null,
    },

    // ── Publish control (admin) ───────────────────────────────────────────
    isPublished: { type: Boolean, default: true },
    publishDate: { type: Date },
    hideDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── VIRTUAL: activitiesCount ─────────────────────────────────────────────────
// Image 1: "Activities: 16" shown on the card
// Derived from activities.length — no need to store and maintain separately
planSchema.virtual("activitiesCount").get(function () {
  return this.activities.length;
});

// ─── VIRTUAL: expectedCompletionTime ──────────────────────────────────────────
// Sum of all activity timeRequired values — gives a total estimated time for the plan
planSchema.virtual("totalTimeMinutes").get(function () {
  // Only works if activities are populated
  if (!this.activities?.length) return 0;
  return this.activities.reduce((sum, item) => {
    const mins = item.activity?.timeRequired || 0;
    return sum + mins;
  }, 0);
});

// ─── INDEXES ──────────────────────────────────────────────────────────────────
planSchema.index({ name: "text", description: "text", summary: "text" });
planSchema.index({ ageGroup: 1, isPublished: 1, isCustom: 1 });
planSchema.index({ category: 1 });
planSchema.index({ createdBy: 1 }); // for member's custom plans
planSchema.index({ "enrollments.user": 1 }); // for "my plans" queries

// ─── MODEL & EXPORT ───────────────────────────────────────────────────────────
const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;
module.exports.PLAN_SEASONS = PLAN_SEASONS;
module.exports.PLAN_CATEGORIES = PLAN_CATEGORIES;
