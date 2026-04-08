const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// ─── VERIFY ACCESS TOKEN ────────────────────────────────────────────────────

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Access denied. Please log in.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Session expired. Please log in again.");
    }
    throw new ApiError(401, "Invalid token. Please log in again.");
  }

  const user = await User.findById(decoded._id);

  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or deactivated.");
  }

  req.user = user;

  next();
});

// ─── ROLE-BASED ACCESS CONTROL ─────────────────────────────────────────────

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    console.log(
      `Authorizing user with role: ${userRole} for roles: ${roles.join(", ")}`,
    );
    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        403, // 403 = Forbidden (you're logged in but don't have permission)
        `Access denied. Required role: ${roles.join(" or ")}`,
      );
    }
    next();
  };
};

// ─── SUPERVISOR PERMISSION CHECK ───────────────────────────────────────────

const checkPermission = (section, action) => {
  return (req, res, next) => {
    if (req.user.role === "superadmin") return next();

    const permission = req.user.supervisorPermissions?.[section]?.[action];
    if (!permission) {
      throw new ApiError(
        403,
        `You don't have permission to ${action} ${section}`,
      );
    }

    next();
  };
};

module.exports = { verifyJWT, authorize, checkPermission };
