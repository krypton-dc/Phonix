const mongoose = require("mongoose");

const dailyActivitySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    messages: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 }
  },
  { _id: false }
);

const userStatsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, index: true },
    username: String,

    totalMessages: { type: Number, default: 0 },
    totalVoiceTime: { type: Number, default: 0 },

    dailyActivity: {
      type: [dailyActivitySchema],
      default: []
    },

    channelActivity: {
      type: Object,
      default: {}
    },

    lastActive: { type: Date, default: Date.now },
    joinedAt: Date
  },
  {
    versionKey: false, // 🔥 prevents VersionError
    minimize: false
  }
);

// Unique user per guild
userStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Useful for leaderboards
userStatsSchema.index({ guildId: 1, totalVoiceTime: -1 });
userStatsSchema.index({ guildId: 1, totalMessages: -1 });

module.exports = mongoose.model("UserStats", userStatsSchema);
