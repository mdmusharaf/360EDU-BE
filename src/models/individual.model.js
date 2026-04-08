const mongoose = require("mongoose");
const { AGE_GROUPS } = require("./user.model");

const individualSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Individual's name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender is required"],
    },

    ageGroup: {
      type: String,
      enum: AGE_GROUPS,
      required: [true, "Age group is required"],
    },

    avatar: {
      type: String,
      default: "",
    },

    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

const Individual = mongoose.model("Individual", individualSchema);
module.exports = Individual;
