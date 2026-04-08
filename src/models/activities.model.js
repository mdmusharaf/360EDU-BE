const mongoose = require("mongoose");

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// These are exported so validation files import them directly.
// Change a value here → it updates everywhere automatically.

const ACTIVITY_AGE_GROUPS = ["3-6", "6-9", "9-12", "12-15"];

const ACTIVITY_FIELDS = [
  "Family and social",
  "Imany",
  "Behavioral and ethical",
  "Mental",
  "Language and Communication",
  "Sharia science",
  "Psychological and self-management",
];

const ACTIVITY_GENDERS = ["everyone", "male", "female"];
const ACTIVITY_LOCATIONS = ["closed", "open", "both"];
const ACTIVITY_GROUP_SIZES = ["individual", "small group", "large group"];
const ACTIVITY_METHODS = [
  "Mental/Thinking",
  "Practical/Performance",
  "Story",
  "Acting",
  "Visits",
  "Discussion",
  "Games",
];

// ─── SUB-SCHEMA: Comment ──────────────────────────────────────────────────────
// Seen in Image 3 — "Share your opinion" form
// Only logged-in members can comment (as per updated requirements)
// Admin must approve before comment goes live

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // login required to comment
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isApproved: { type: Boolean, default: false },
    // Admin approves before it shows publicly
  },
  { timestamps: true },
);

// ─── SUB-SCHEMA: Attachment ───────────────────────────────────────────────────
// Image 3 & 4 — "Attachments" section, downloadable file with a label
// e.g. label: "Profession and tools", url: "https://cloudinary.com/..."

const attachmentSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true },
  },
  { _id: false }, // no need for a separate _id on each attachment
);

// ─── SUB-SCHEMA: Error Report ─────────────────────────────────────────────────
// Requirement: member can report an error on an activity (free text)
// Admin sees these in the panel and can mark them resolved

const errorReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true },
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ─── SUB-SCHEMA: Completion ───────────────────────────────────────────────────
// Requirement: "Mark activity as completed (date auto recorded)"
// A member can mark it for themselves OR on behalf of a managed Individual

const completionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    individual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Individual",
      default: null,
    },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ─── MAIN ACTIVITY SCHEMA ─────────────────────────────────────────────────────
const activitySchema = new mongoose.Schema(
  {
    // ── Shown on list card (Image 1) ──────────────────────────────────────
    name: {
      type: String,
      required: [true, "Activity name is required"],
      trim: true,
      maxlength: [150, "Name cannot exceed 150 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    // Cover image — Cloudinary URL
    image: { type: String, default: "" },

    // ── Classification (Image 2 detail sidebar) ───────────────────────────
    // "3-6 سنوات" badge shown on the card
    ageGroup: {
      type: String,
      required: [true, "Age group is required"],
      enum: ACTIVITY_AGE_GROUPS,
    },

    // "Domain: Family and social"
    field: {
      type: String,
      required: [true, "Field is required"],
      enum: ACTIVITY_FIELDS,
    },

    // "Gender: everyone"
    gender: {
      type: String,
      enum: ACTIVITY_GENDERS,
      default: "everyone",
    },

    // "Place of implementation: closed or open"
    location: {
      type: String,
      enum: ACTIVITY_LOCATIONS,
      default: "both",
    },

    // "Expected time: 30 minutes" — stored as integer minutes
    // Shown as "30 دقيقة" on the card
    timeRequired: {
      type: Number,
      required: [true, "Time required is required"],
      min: [1, "Must be at least 1 minute"],
    },

    // "Number: Small group"
    groupSize: {
      type: String,
      enum: ACTIVITY_GROUP_SIZES,
      default: "small group",
    },

    // "Style: Mental/Thinking - Practical/Performance"
    // Array because one activity can have multiple methods (Image 2 shows two)
    method: {
      type: [String],
      enum: ACTIVITY_METHODS,
      default: [],
    },

    // ── Numbered steps (Image 4) ──────────────────────────────────────────
    // The actual instructions e.g. step 1, step 2 ... stored as plain string array
    // Index in the array = step number
    steps: {
      type: [String],
      default: [],
    },

    // ── Attachments (Image 3 & 4) ─────────────────────────────────────────
    attachments: [attachmentSchema],

    // ── Rating ────────────────────────────────────────────────────────────
    // We store pre-calculated average + count for fast reads.
    // Recalculated every time admin approves a comment — not on every request.
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10, // 4.27 → 4.3
    },
    ratingCount: { type: Number, default: 0 },

    // ── Comments ──────────────────────────────────────────────────────────
    comments: [commentSchema],

    // ── Favorites ─────────────────────────────────────────────────────────
    // Store array of user IDs so we know if the current user already favorited
    favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    favoritesCount: { type: Number, default: 0 },

    // ── Completions ───────────────────────────────────────────────────────
    completions: [completionSchema],

    // ── Error Reports ─────────────────────────────────────────────────────
    errorReports: [errorReportSchema],

    // ── Approval Workflow ─────────────────────────────────────────────────
    // pending  → member submitted, waiting for admin
    // approved → admin approved but not yet live (has future publishDate)
    // rejected → admin rejected
    // live     → visible to the public
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "live"],
      default: "live", // admin-created = live immediately
      index: true,
    },

    // Who submitted it — null means created directly by admin
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: { type: String, default: "" },
    publishDate: { type: Date },
    hideDate: { type: Date },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── VIRTUAL: human readable time label ───────────────────────────────────────
// So the frontend can show "30 minutes" without doing the formatting itself
activitySchema.virtual("timeLabel").get(function () {
  return `${this.timeRequired} minutes`;
});

// ─── INDEXES ──────────────────────────────────────────────────────────────────
// text index → powers the keyword search on name + description
activitySchema.index({ name: "text", description: "text" });

// compound index → used by filter queries (ageGroup + field + status together)
activitySchema.index({ ageGroup: 1, field: 1, status: 1 });

// used on the public listing page
activitySchema.index({ status: 1, isPublished: 1 });

// used to find a specific member's submitted activities
activitySchema.index({ submittedBy: 1 });

// ─── MODEL & EXPORT ───────────────────────────────────────────────────────────
const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
module.exports.ACTIVITY_AGE_GROUPS = ACTIVITY_AGE_GROUPS;
module.exports.ACTIVITY_FIELDS = ACTIVITY_FIELDS;
module.exports.ACTIVITY_GENDERS = ACTIVITY_GENDERS;
module.exports.ACTIVITY_LOCATIONS = ACTIVITY_LOCATIONS;
module.exports.ACTIVITY_GROUP_SIZES = ACTIVITY_GROUP_SIZES;
module.exports.ACTIVITY_METHODS = ACTIVITY_METHODS;
