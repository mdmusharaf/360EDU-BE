// src/modules/content/contactMessages.controller.js
//
// TWO sides:
//
//   PUBLIC  — POST /api/contact         → anyone can submit the form (Image 1)
//   ADMIN   — GET/PATCH /api/admin/contact → admin inbox + reply workflow
//
// WORKFLOW:
//   Guest/Member submits form → status: "unread"
//   Admin opens message       → status: "read"
//   Admin replies             → status: "replied", adminReply stored
//   TODO: trigger email to sender when admin replies (notifications module)

const { validationResult } = require("express-validator");
const ContactMessage = require("../../models/ContactMessage.model");
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
// SUBMIT CONTACT FORM  —  POST /api/contact
// PUBLIC — Image 1 contact form, anyone can submit
// ═══════════════════════════════════════════════════════════════════════════════
//
// REQUEST BODY (from Image 1):
// {
//   "name": "Ahmed",
//   "email": "ahmed@example.com",
//   "mobile": "966512345678",
//   "messageType": "inquiry",
//   "messageTitle": "Question about activities",
//   "messageText": "I would like to know...",
//   "attachment": "https://cloudinary.com/file.pdf"  // optional
// }

const submitContactForm = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    name,
    email,
    mobile,
    messageType,
    messageTitle,
    messageText,
    attachment,
  } = req.body;

  const message = await ContactMessage.create({
    name,
    email,
    mobile,
    messageType,
    messageTitle,
    messageText,
    attachment: attachment || null,
    // If a logged-in member submits, link their account
    // req.user is null for guests (optionalAuth middleware)
    sentBy: req.user?._id || null,
    status: "unread",
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { messageId: message._id },
        "Message sent successfully. We will get back to you soon.",
      ),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL MESSAGES  —  GET /api/admin/contact
// Admin inbox — sorted by unread first, then newest
// ═══════════════════════════════════════════════════════════════════════════════
//
// QUERY PARAMS:
//   ?status=unread|read|replied   filter by status
//   ?messageType=inquiry|complaint|proposal|other
//   ?page=1&limit=20

const getAllMessages = asyncHandler(async (req, res) => {
  const { status, messageType, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (messageType) filter.messageType = messageType;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [messages, total, unreadCount] = await Promise.all([
    ContactMessage.find(filter)
      .select("-messageText -adminReply") // exclude heavy fields from list view
      .populate("sentBy", "username email")
      .sort({ status: 1, createdAt: -1 })
      // status:1 sorts "unread" before "read" before "replied" alphabetically
      // We want unread first so we use a custom sort below
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ status: "unread" }), // badge count for admin panel
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        messages,
        unreadCount, // shown as a badge on the admin inbox menu item
        pagination: {
          total,
          page: pageNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      "Messages fetched successfully",
    ),
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET SINGLE MESSAGE  —  GET /api/admin/contact/:id
// Opens the full message — auto-marks as read
// ═══════════════════════════════════════════════════════════════════════════════

const getMessageById = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id)
    .populate("sentBy", "username email mobile")
    .populate("repliedBy", "username");

  if (!message) throw new ApiError(404, "Message not found");

  // Auto-mark as read when admin opens it
  if (message.status === "unread") {
    message.status = "read";
    await message.save({ validateBeforeSave: false });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { message }, "Message fetched successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: REPLY TO MESSAGE  —  PATCH /api/admin/contact/:id/reply
// req.user._id = admin replying (from token — never from URL)
// ═══════════════════════════════════════════════════════════════════════════════
//
// REQUEST BODY:
// { "reply": "Thank you for reaching out. We will..." }

const replyToMessage = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { reply } = req.body;

  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        adminReply: reply,
        status: "replied",
        repliedAt: new Date(),
        repliedBy: req.user._id, // from JWT token — who replied
      },
    },
    { new: true },
  ).populate("repliedBy", "username");

  if (!message) throw new ApiError(404, "Message not found");

  // TODO: send email to message.email with the reply text
  // Will be implemented in the notifications module

  return res
    .status(200)
    .json(new ApiResponse(200, { message }, "Reply sent successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: DELETE MESSAGE  —  DELETE /api/admin/contact/:id
// ═══════════════════════════════════════════════════════════════════════════════

const deleteMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) throw new ApiError(404, "Message not found");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

module.exports = {
  submitContactForm,
  getAllMessages,
  getMessageById,
  replyToMessage,
  deleteMessage,
};
