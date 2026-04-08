const { validationResult } = require("express-validator");
const Banner = require("../../models/banner.model");
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
// PUBLIC: GET BANNERS  —  GET /api/banners?section=home_top
// ═══════════════════════════════════════════════════════════════════════════════

const getBanners = asyncHandler(async (req, res) => {
  const { section = "home_top" } = req.query;
  const now = new Date();

  // Audience: logged-in members see "all"+"member", guests see "all"+"guest"
  const audience = req.user ? ["all", "member"] : ["all", "guest"];

  // Simple flat filter — easier to debug than nested $or/$and
  const banners = await Banner.find({
    section,
    isActive: true,
    targetAudience: { $in: audience },
    // startDate: not set yet OR already started
    $or: [
      { startDate: null },
      { startDate: { $exists: false } },
      { startDate: { $lte: now } },
    ],
  })
    .select("title image linkType linkUrl order targetAudience")
    .sort({ order: 1, createdAt: -1 })
    .lean();

  // Filter out expired banners in JS — simpler than nested $and in Mongo
  const active = banners.filter(
    (b) => !b.endDate || new Date(b.endDate) >= now,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, { banners: active }, "Banners fetched successfully"),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL BANNERS  —  GET /api/admin/banners
// Full list including inactive/expired
// ═══════════════════════════════════════════════════════════════════════════════

const getAllBanners = asyncHandler(async (req, res) => {
  const { section, isActive } = req.query;

  const filter = {};
  if (section) filter.section = section;
  // Only apply isActive filter if explicitly passed as query param
  // ?isActive=true  → only active banners
  // ?isActive=false → only inactive banners
  // no param        → ALL banners (admin needs to see everything)
  if (isActive === "true") filter.isActive = true;
  if (isActive === "false") filter.isActive = false;

  const banners = await Banner.find(filter)
    .sort({ section: 1, order: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, { banners }, "Banners fetched successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: CREATE BANNER  —  POST /api/admin/banners
// ═══════════════════════════════════════════════════════════════════════════════

const createBanner = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    title,
    image,
    section,
    linkType,
    linkUrl,
    startDate,
    endDate,
    order,
    targetAudience,
    isActive,
  } = req.body;

  const banner = await Banner.create({
    title,
    image,
    section: section || "home_top",
    linkType: linkType || "none",
    linkUrl: linkUrl || "",
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    order: order || 1,
    targetAudience: targetAudience || "all",
    isActive: isActive !== undefined ? isActive : true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { banner }, "Banner created successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: UPDATE BANNER  —  PATCH /api/admin/banners/:id
// ═══════════════════════════════════════════════════════════════════════════════

const updateBanner = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const allowed = [
    "title",
    "image",
    "section",
    "linkType",
    "linkUrl",
    "startDate",
    "endDate",
    "order",
    "targetAudience",
    "isActive",
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowed.includes(key)) {
      if ((key === "startDate" || key === "endDate") && req.body[key]) {
        updates[key] = new Date(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    }
  });

  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!banner) throw new ApiError(404, "Banner not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { banner }, "Banner updated successfully"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: TOGGLE ACTIVE  —  PATCH /api/admin/banners/:id/toggle
// ═══════════════════════════════════════════════════════════════════════════════

const toggleBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, "Banner not found");

  banner.isActive = !banner.isActive;
  await banner.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isActive: banner.isActive },
        `Banner ${banner.isActive ? "activated" : "deactivated"} successfully`,
      ),
    );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: DELETE BANNER  —  DELETE /api/admin/banners/:id
// ═══════════════════════════════════════════════════════════════════════════════

const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new ApiError(404, "Banner not found");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Banner deleted successfully"));
});

module.exports = {
  getBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  toggleBanner,
  deleteBanner,
};
