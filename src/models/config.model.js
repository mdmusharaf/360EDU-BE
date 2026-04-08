// src/models/Config.model.js
//
// Stores admin-managed additions to dropdown values.
//
// HYBRID APPROACH:
//   Base values  → hardcoded constants in Activity.model.js (never deleteable)
//   Custom values → stored here (admin can add new ones at runtime)
//
// WHY HYBRID?
//   Existing activities have values like "Family and social" stored.
//   If we made everything DB-managed, admin could accidentally rename a base value
//   and break thousands of existing activity documents.
//   So: base values are locked in code, admin can only ADD new values here.
//
// EXAMPLE:
//   Admin wants to add a new domain "Environmental education"
//   → POST /api/admin/config/activity_fields { value: "Environmental education" }
//   → stored here
//   → GET /api/config/dropdowns merges base + custom and returns the full list
//
// KEYS MANAGED:
//   activity_fields   → new activity domain/field values
//   activity_methods  → new activity method/style values

const mongoose = require("mongoose");

const CONFIG_KEYS = ["activity_fields", "activity_methods"];

const configSchema = new mongoose.Schema(
  {
    // Which dropdown this config belongs to
    key: {
      type: String,
      required: true,
      unique: true,
      enum: CONFIG_KEYS,
    },

    // Array of custom values added by admin
    // e.g. ["Environmental education", "Digital literacy"]
    values: {
      type: [String],
      default: [],
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const Config = mongoose.model("Config", configSchema);

module.exports = Config;
module.exports.CONFIG_KEYS = CONFIG_KEYS;
