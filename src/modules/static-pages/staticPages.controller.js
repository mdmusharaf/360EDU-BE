// src/modules/content/staticPages.controller.js
//
// TWO sides to this controller:
//
//   PUBLIC  (no login needed):
//     GET /api/pages/:slug  → frontend fetches page content to render
//
//   ADMIN only (superadmin):
//     GET   /api/admin/pages          → list all pages (for admin panel sidebar)
//     GET   /api/admin/pages/:slug    → get single page for editing in the editor
//     PATCH /api/admin/pages/:slug    → save edited HTML content
//
// HTML SANITIZATION:
//   Admin saves HTML from a rich text editor (TipTap, Quill etc.)
//   We sanitize it with sanitize-html before storing to prevent XSS.
//   Even though this is admin-only, it is good practice.
//   Allowed: all standard formatting tags (h1-h6, p, ul, ol, li, strong, em, a, img etc.)
//   Blocked: <script>, <iframe>, event handlers (onclick etc.)

const { validationResult } = require("express-validator");
const sanitizeHtml = require("sanitize-html");
const StaticPage = require("../../models/staticPage.model");
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

// ── Sanitize config ────────────────────────────────────────────────────────────
// What tags and attributes we allow from the rich text editor
const sanitizeConfig = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "blockquote",
    "pre",
    "code",
    "div",
    "span",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    "*": ["class", "style", "dir"], // dir for Arabic RTL support
  },
  // Strip any <script>, <iframe>, onclick, onerror etc. automatically
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC: GET PAGE  —  GET /api/pages/:slug
// No login needed — Next.js calls this to render the page
// ═══════════════════════════════════════════════════════════════════════════════
//
// USAGE FROM NEXT.JS:
//   // In your page component:
//   const res = await fetch(`${API_URL}/api/pages/about-platform`);
//   const { data } = await res.json();
//   return <div dangerouslySetInnerHTML={{ __html: data.page.content }} />

const getPage = asyncHandler(async (req, res) => {
  const page = await StaticPage.findOne({
    slug: req.params.slug,
    isPublished: true,
  }).select("-lastEditedBy -__v"); // no need to expose these to the public

  if (!page) throw new ApiError(404, "Page not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { page }, "Page fetched successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: LIST ALL PAGES  —  GET /api/admin/pages
// Shows all pages in the admin panel sidebar for quick navigation
// ═══════════════════════════════════════════════════════════════════════════════

const getAllPages = asyncHandler(async (req, res) => {
  // Only return metadata — not the full HTML content (can be large)
  const pages = await StaticPage.find()
    .select("slug title isPublished updatedAt lastEditedBy")
    .populate("lastEditedBy", "username")
    .sort({ slug: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { pages }, "Pages fetched successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET SINGLE PAGE FOR EDITING  —  GET /api/admin/pages/:slug
// Loads the full HTML content into the rich text editor
// ═══════════════════════════════════════════════════════════════════════════════

const getPageForEdit = asyncHandler(async (req, res) => {
  const page = await StaticPage.findOne({ slug: req.params.slug }).populate(
    "lastEditedBy",
    "username email",
  );

  if (!page) throw new ApiError(404, "Page not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { page }, "Page fetched successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: UPDATE PAGE CONTENT  —  PATCH /api/admin/pages/:slug
// Admin saves from the rich text editor
// ═══════════════════════════════════════════════════════════════════════════════
//
// REQUEST BODY:
// {
//   "content": "<h1>About 360 Education</h1><p>...</p>",  // raw HTML from editor
//   "metaTitle": "About 360 Education",                    // optional
//   "metaDescription": "Learn about...",                   // optional
//   "isPublished": true                                    // optional
// }

const updatePage = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { content, metaTitle, metaDescription, isPublished } = req.body;

  // ── Sanitize the HTML before saving ─────────────────────────────────
  // This strips any <script> tags, event handlers (onclick etc.) the editor
  // might have injected or an attacker might have crafted
  const cleanContent = content
    ? sanitizeHtml(content, sanitizeConfig)
    : undefined;

  // Build update object — only include fields that were actually sent
  const updates = {
    ...(cleanContent !== undefined && { content: cleanContent }),
    ...(metaTitle !== undefined && { metaTitle }),
    ...(metaDescription !== undefined && { metaDescription }),
    ...(isPublished !== undefined && { isPublished }),
    lastEditedBy: req.user._id, // track who made the last edit (from token)
  };

  const page = await StaticPage.findOneAndUpdate(
    { slug: req.params.slug },
    { $set: updates },
    { new: true },
  ).populate("lastEditedBy", "username");

  if (!page) throw new ApiError(404, "Page not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { page }, "Page updated successfully"));
});

module.exports = { getPage, getAllPages, getPageForEdit, updatePage };
