const { validationResult } = require("express-validator");
const User = require("../../models/user.model");
const Individual = require("../../models/individual.model");
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

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -passwordResetToken -passwordResetExpires",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const allowedFields = [
    "username",
    "mobile",
    "dateOfBirth",
    "gender",
    "country",
    "city",
    "bio",
    "accountStatus",
    "avatar",
  ];

  const updates = {};
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid fields provided to update");
  }

  if (updates.mobile) {
    const existing = await User.findOne({
      mobile: updates.mobile,
      _id: { $ne: req.user._id },
    });
    if (existing)
      throw new ApiError(409, "This mobile number is already in use");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true },
  ).select("-password -refreshToken -passwordResetToken -passwordResetExpires");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Profile updated successfully",
      ),
    );
});

const changePassword = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(
      400,
      "New password cannot be the same as your current password",
    );
  }

  user.password = newPassword;
  await user.save();

  user.refreshToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please log in again.",
      ),
    );
});

const updateInterests = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { interestAgeGroups, interestFields } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { interestAgeGroups, interestFields } },
    { new: true, runValidators: true },
  ).select("interestAgeGroups interestFields");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        interestAgeGroups: user.interestAgeGroups,
        interestFields: user.interestFields,
      },
      "Interests updated successfully",
    ),
  );
});

const updateNotifPrefs = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { email, push, sms } = req.body;

  const updates = {};
  if (email !== undefined) updates["notificationPrefs.email"] = email;
  if (push !== undefined) updates["notificationPrefs.push"] = push;
  if (sms !== undefined) updates["notificationPrefs.sms"] = sms;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true },
  ).select("notificationPrefs");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { notificationPrefs: user.notificationPrefs },
        "Notification preferences updated",
      ),
    );
});

const getIndividuals = asyncHandler(async (req, res) => {
  const individuals = await Individual.find({ managedBy: req.user._id }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { individuals, count: individuals.length },
        "Individuals fetched successfully",
      ),
    );
});

const createIndividual = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { name, gender, ageGroup, avatar } = req.body;

  const individual = await Individual.create({
    name,
    gender,
    ageGroup,
    avatar: avatar || "",
    managedBy: req.user._id,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, { individual }, "Individual created successfully"),
    );
});

const updateIndividual = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const individual = await Individual.findOne({
    _id: req.params.id,
    managedBy: req.user._id,
  });

  if (!individual) {
    throw new ApiError(404, "Individual not found");
  }

  const { name, gender, ageGroup, avatar } = req.body;

  if (name) individual.name = name;
  if (gender) individual.gender = gender;
  if (ageGroup) individual.ageGroup = ageGroup;
  if (avatar !== undefined) individual.avatar = avatar;

  await individual.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { individual }, "Individual updated successfully"),
    );
});

const deleteIndividual = asyncHandler(async (req, res) => {
  const individual = await Individual.findOneAndDelete({
    _id: req.params.id,
    managedBy: req.user._id,
  });

  if (!individual) {
    throw new ApiError(404, "Individual not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Individual deleted successfully"));
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  updateInterests,
  updateNotifPrefs,
  getIndividuals,
  createIndividual,
  updateIndividual,
  deleteIndividual,
};
