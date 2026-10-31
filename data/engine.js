// @data/engine.js
const mongoose = require("mongoose");

const EngineSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: false, // optional if it's a user-specific preference
    index: true,
  },
  userId: {
    type: String,
    required: false, // optional if it's a guild-specific preference
    index: true,
  },
  engine: {
    type: String,
    enum: ["ytsearch", "spsearch", "scsearch", "sssearch", "ytmsearch"],
    default: "ytsearch",
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate configs (one per guild OR one per user)
EngineSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Engine", EngineSchema);
