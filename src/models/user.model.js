const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AGE_GROUPS = ["3-6", "6-9", "9-12", "12-15"];

const INTEREST_FIELDS = [
  "Family and social",
  "Imany",
  "Behavioral and ethical",
  "Mental",
  "Language and Communication",
  "Sharia science",
  "Psychological and self-management",
];

const permissionsSchema = new mongoose.Schema(
  {
    activities: {
      add: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    plans: {
      add: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    comments: {
      manage: { type: Boolean, default: false },
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    mobile: {
      type: String,
      trim: true,
      sparse: true,
    },

    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
    },

    role: {
      type: String,
      enum: ["guest", "member", "supervisor", "superadmin"],
      default: "member",
    },

    accountStatus: {
      type: String,
      enum: ["individual", "institution"],
      default: "individual",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },

    oauthId: { type: String },

    country: { type: String, trim: true, default: "Saudi Arabia" },

    city: { type: String, trim: true },

    bio: {
      type: String,
      maxlength: [500, "Profile/Bio cannot exceed 500 characters"],
    },

    avatar: {
      type: String,
      default: "",
    },

    interestAgeGroups: [{ type: String, enum: AGE_GROUPS }],

    interestFields: [{ type: String, enum: INTEREST_FIELDS }],

    supervisorPermissions: permissionsSchema,

    notificationPrefs: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },

    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    agreedToTerms: {
      type: Boolean,
      required: [true, "You must agree to the terms"],
      default: false,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── INDEXES ──────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ interestFields: 1 });
userSchema.index({ interestAgeGroups: 1 });
const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.AGE_GROUPS = AGE_GROUPS;
module.exports.INTEREST_FIELDS = INTEREST_FIELDS;
