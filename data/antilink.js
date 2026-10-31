const mongoose = require("mongoose");

const strikeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  strikes: {
    type: Number,
    default: 0,
  },
  lastStrike: {
    type: Date,
    default: Date.now,
  },
});

// Main AntiLink configuration schema
const antiLinkSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  isEnabled: {
    type: Boolean,
    default: false,
  },
  whitelistUsers: {
    type: [String],
    default: [],
  },
  whitelistRoles: {
    type: [String],
    default: [],
  },
  whitelistChannels: {
    type: [String],
    default: [],
  },
  action: {
    type: String,
    enum: ["delete", "warn", "log"],
    default: "delete",
  },
  punishment: {
    type: String,
    enum: ["none", "timeout", "kick", "ban"],
    default: "none",
  },
  allowedDomains: {
    type: [String],
    default: [],
  },
  logChannel: {
    type: String,
    default: null,
  },
  bypassRoles: {
    type: [String],
    default: [],
  },
  strikes: {
    type: [strikeSchema],
    default: [],
  },
  maxStrikes: {
    type: Number,
    default: 3,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AntiLink", antiLinkSchema);
