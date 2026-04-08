// src/models/StaticPage.model.js
//
// Stores HTML content for pages managed by the admin via a rich text editor.
// Frontend fetches by slug and renders with dangerouslySetInnerHTML.
//
// PAGES MANAGED HERE:
//   about-platform         → "About the platform" page (Image 2)
//   privacy-policy         → Privacy Policy page
//   registration-terms     → Registration Terms page
//   activity-submission-terms → Activity Submission Terms
//   contact-info           → Contact Us info block (company name, phone, email)

const mongoose = require("mongoose");

const staticPageSchema = new mongoose.Schema(
  {
    // URL-friendly identifier — used to fetch the page
    // e.g. GET /api/pages/about-platform
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: [
        "about-platform",
        "privacy-policy",
        "registration-terms",
        "activity-submission-terms",
        "contact-info",
      ],
    },

    // Display name shown in the admin panel page list
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // The actual HTML content from the rich text editor
    // Sanitized before saving — no <script> tags allowed
    content: {
      type: String,
      default: "",
    },

    // Meta fields for SEO (used by Next.js <Head>)
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },

    isPublished: { type: Boolean, default: true },

    // Track who last edited it — useful for admin audit trail
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const StaticPage = mongoose.model("StaticPage", staticPageSchema);
module.exports = StaticPage;
