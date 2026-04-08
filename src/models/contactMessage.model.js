// src/models/ContactMessage.model.js
//
// Stores submissions from the Contact Us form (Image 1).
//
// FORM FIELDS VISIBLE IN IMAGE 1:
//   Name, Email, Mobile, Messaging type (dropdown), Message title, Message text, Attachment
//
// MESSAGING TYPE OPTIONS (confirmed): Inquiry, Complaint, Proposal, Other
//
// ADMIN WORKFLOW:
//   unread → admin opens it → read → admin replies → replied
//   Admin reply triggers an email notification to the sender.

const mongoose = require("mongoose");

const MESSAGE_TYPES = ["inquiry", "complaint", "proposal", "other"];
const MESSAGE_STATUSES = ["unread", "read", "replied"];

const contactMessageSchema = new mongoose.Schema(
  {
    // ── Sender info ────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 60,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile is required"],
      trim: true,
      // Image 1 shows format: 9665xxxxxxxx (without the +)
    },

    // ── Message content ────────────────────────────────────────────────
    // Image 1: "Messaging type" dropdown → Inquiry / Complaint / Proposal / Other
    messageType: {
      type: String,
      required: [true, "Message type is required"],
      enum: MESSAGE_TYPES,
      default: "inquiry",
    },

    // Image 1: "Message title" field
    messageTitle: {
      type: String,
      required: [true, "Message title is required"],
      trim: true,
      maxlength: 150,
    },

    // Image 1: "Message text" textarea
    messageText: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: 2000,
    },

    // Image 1: "attached" file upload — stored as Cloudinary URL after upload
    attachment: {
      type: String,
      default: null,
    },

    // ── If sender is a logged-in member, link their account ───────────
    // null = sent by a guest
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Admin workflow ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: MESSAGE_STATUSES,
      default: "unread",
      index: true,
    },

    // Admin's reply text — shown to the user via email
    adminReply: {
      type: String,
      default: "",
    },

    repliedAt: { type: Date, default: null },

    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // the admin who replied
      default: null,
    },
  },
  { timestamps: true },
);

// Index for admin inbox — sorted by unread + newest first
contactMessageSchema.index({ status: 1, createdAt: -1 });

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

module.exports = ContactMessage;
module.exports.MESSAGE_TYPES = MESSAGE_TYPES;
module.exports.MESSAGE_STATUSES = MESSAGE_STATUSES;
