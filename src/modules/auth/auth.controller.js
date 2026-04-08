const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const User = require("../../models/user.model");
const generateTokens = require("../../utils/generateToken");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

const sendTokenCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    throw new ApiError(
      400,
      "Validation failed",
      errors.array().map((e) => e.msg),
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// SIGNUP  —  POST /api/auth/signup
// ═══════════════════════════════════════════════════════════════════════════
const signup = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const {
    username,
    email,
    password,
    mobile,
    dateOfBirth,
    gender,
    accountStatus,
    country,
    city,
    bio,
    interestAgeGroups,
    interestFields,
    agreedToTerms,
  } = req.body;

  // Duplicate checks
  if (await User.findOne({ email }))
    throw new ApiError(409, "An account with this email already exists");

  if (await User.findOne({ mobile }))
    throw new ApiError(
      409,
      "An account with this mobile number already exists",
    );

  const user = await User.create({
    username,
    email,
    password,
    mobile,
    dateOfBirth,
    gender,
    accountStatus: accountStatus || "individual",
    country: country || "Saudi Arabia",
    city,
    bio,
    interestAgeGroups: interestAgeGroups || [],
    interestFields: interestFields || [],
    agreedToTerms: agreedToTerms === "true" || agreedToTerms === true,
    role: "member",
  });

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  sendTokenCookies(res, accessToken, refreshToken);

  const userResponse = {
    _id: user._id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    accountStatus: user.accountStatus,
    country: user.country,
    city: user.city,
    bio: user.bio,
    interestAgeGroups: user.interestAgeGroups,
    interestFields: user.interestFields,
    role: user.role,
    createdAt: user.createdAt,
  };

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: userResponse, accessToken },
        "Account created successfully",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user || !user.isActive)
    throw new ApiError(401, "Invalid email or password");
  if (!(await user.comparePassword(password)))
    throw new ApiError(401, "Invalid email or password");

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  sendTokenCookies(res, accessToken, refreshToken);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          accountStatus: user.accountStatus,
          country: user.country,
          city: user.city,
          avatar: user.avatar,
          role: user.role,
          interestAgeGroups: user.interestAgeGroups,
          interestFields: user.interestFields,
          createdAt: user.createdAt,
        },
        accessToken,
      },
      "Logged in successfully",
    ),
  );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (!incomingRefreshToken)
    throw new ApiError(401, "Refresh token not found. Please log in again.");

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(
      401,
      "Invalid or expired refresh token. Please log in again.",
    );
  }

  const user = await User.findById(decoded._id).select("+refreshToken");
  if (!user || !user.isActive) throw new ApiError(401, "User not found.");
  if (user.refreshToken !== incomingRefreshToken)
    throw new ApiError(401, "Refresh token already used. Please log in again.");

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });
  sendTokenCookies(res, accessToken, newRefreshToken);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { accessToken }, "Token refreshed successfully"),
    );
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -passwordResetToken -passwordResetExpires",
  );
  if (!user) throw new ApiError(404, "User not found");
  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User fetched successfully"));
});

module.exports = { signup, login, logout, getMe, refreshAccessToken };
