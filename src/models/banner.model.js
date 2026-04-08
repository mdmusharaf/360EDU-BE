// src/models/Banner.model.js
//
// Promotional banners shown on the home page.
// Starting simple with home_top only — can add more sections later.
//
// ADMIN CONTROLS:
//   - Upload banner image
//   - Set a link (internal page or external URL)
//   - Set start and end dates (auto show/hide)
//   - Set display order (if multiple banners in same section)
//   - Target audience: all visitors, guests only, or members only
//
// FRONTEND CALLS:
//   GET /api/banners?section=home_top
//   → returns only active + non-expired banners
//   → sorted by order ascending

const mongoose = require("mongoose");

// Starting with home_top only — easy to add more sections later
const BANNER_SECTIONS = [
  "home_top",
  // "activities_top",  // add when needed
  // "plans_top",       // add when needed
  // "dashboard",       // add when needed
];

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: 150,
    },

    // Cloudinary URL — uploaded via admin panel
    image: {
      type: String,
      required: [true, "Banner image is required"],
    },

    // Which part of the site this banner appears on
    section: {
      type: String,
      enum: BANNER_SECTIONS,
      default: "home_top",
      index: true,
    },

    // ── Link ──────────────────────────────────────────────────────────
    linkType: {
      type: String,
      enum: ["internal", "external", "none"],
      default: "none",
    },

    // For internal: "/plans?category=Ramadan"
    // For external: "https://example.com"
    // Empty if linkType is "none"
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Scheduling ────────────────────────────────────────────────────
    // null = no start restriction (show immediately when isActive)
    startDate: { type: Date, default: null },

    // null = no end restriction (show until manually deactivated)
    endDate: { type: Date, default: null },

    isActive: { type: Boolean, default: true },

    // ── Display order within a section ────────────────────────────────
    // Lower number = shows first
    // If two banners have the same order, newest wins
    order: { type: Number, default: 1 },

    // ── Target audience ───────────────────────────────────────────────
    // "all"    → shown to everyone
    // "guest"  → shown only to non-logged-in users (e.g. "Register now!")
    // "member" → shown only to logged-in members (e.g. "New feature!")
    targetAudience: {
      type: String,
      enum: ["all", "guest", "member"],
      default: "all",
    },
  },
  { timestamps: true },
);

// Index for fast public banner queries
bannerSchema.index({ section: 1, isActive: 1, order: 1 });

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
module.exports.BANNER_SECTIONS = BANNER_SECTIONS;
