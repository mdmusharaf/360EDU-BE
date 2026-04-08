// src/modules/content/contactMessages.routes.js

const express = require("express");
const router = express.Router();

const {
  submitContactForm,
  getAllMessages,
  getMessageById,
  replyToMessage,
  deleteMessage,
} = require("./contact.controller");

const {
  submitFormValidation,
  replyValidation,
  getMessagesValidation,
} = require("./contact.validation");

const { verifyJWT, authorize } = require("../../middleware/auth.middleware");

// Optional auth — guests can submit, logged-in members get their account linked
const optionalAuth = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return next();
  const jwt = require("jsonwebtoken");
  const User = require("../../models/user.model");
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    User.findById(decoded._id)
      .select("-password -refreshToken")
      .then((user) => {
        req.user = user || null;
        next();
      });
  } catch {
    next();
  }
};

/**
 * @swagger
 * tags:
 *   - name: Contact — Public
 *     description: Contact Us form submission. Open to everyone.
 *   - name: Contact — Admin
 *     description: Admin inbox — view, reply and manage contact messages.
 */

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit contact form
 *     description: |
 *       Public endpoint. Guests and members can both submit.
 *       If a logged-in member submits, their account is automatically linked to the message.
 *       Admin sees the inbox at GET /admin/contact.
 *     tags: [Contact — Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, mobile, messageType, messageTitle, messageText]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ahmed Al-Rashidi
 *               email:
 *                 type: string
 *                 example: ahmed@example.com
 *               mobile:
 *                 type: string
 *                 description: Format 966XXXXXXXXX (no + prefix)
 *                 example: "966512345678"
 *               messageType:
 *                 type: string
 *                 enum: [inquiry, complaint, proposal, other]
 *                 example: inquiry
 *               messageTitle:
 *                 type: string
 *                 example: Question about activities
 *               messageText:
 *                 type: string
 *                 example: I would like to know more about...
 *               attachment:
 *                 type: string
 *                 description: Optional Cloudinary URL of uploaded file
 *                 example: https://cloudinary.com/file.pdf
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Message sent successfully. We will get back to you soon."
 *               data: { messageId: "64abc123" }
 *       400:
 *         description: Validation error
 */
router.post("/", optionalAuth, submitFormValidation, submitContactForm);

// ── Admin routes ───────────────────────────────────────────────────────────────
router.use(verifyJWT, authorize("superadmin"));

/**
 * @swagger
 * /admin/contact:
 *   get:
 *     summary: Get all contact messages (Admin inbox)
 *     description: |
 *       Returns paginated messages sorted by unread first, then newest.
 *       Also returns `unreadCount` for the inbox badge in the admin panel.
 *     tags: [Contact — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [unread, read, replied] }
 *       - in: query
 *         name: messageType
 *         schema: { type: string, enum: [inquiry, complaint, proposal, other] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Messages list with unread badge count
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 messages: []
 *                 unreadCount: 5
 *                 pagination: { total: 42, page: 1, totalPages: 3 }
 */
router.get("/", getMessagesValidation, getAllMessages);

/**
 * @swagger
 * /admin/contact/{id}:
 *   get:
 *     summary: Get single message (auto-marks as read)
 *     description: |
 *       Returns full message including messageText and adminReply.
 *       Automatically changes status from `unread` to `read` when opened.
 *     tags: [Contact — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full message detail
 *       404:
 *         description: Message not found
 */
router.get("/:id", getMessageById);

/**
 * @swagger
 * /admin/contact/{id}/reply:
 *   patch:
 *     summary: Reply to a contact message
 *     description: |
 *       Stores the admin reply and changes status to `replied`.
 *       `repliedBy` is set automatically from the JWT token — not from the request body.
 *       TODO: triggers email to the sender (notifications module).
 *     tags: [Contact — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reply]
 *             properties:
 *               reply:
 *                 type: string
 *                 example: "Thank you for reaching out. We will look into this..."
 *     responses:
 *       200:
 *         description: Reply sent, status changed to replied
 *       404:
 *         description: Message not found
 */
router.patch("/:id/reply", replyValidation, replyToMessage);

/**
 * @swagger
 * /admin/contact/{id}:
 *   delete:
 *     summary: Delete a contact message
 *     tags: [Contact — Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 */
router.delete("/:id", deleteMessage);

module.exports = router;
