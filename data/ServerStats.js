const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    value: { type: Number, required: true }
  },
  { _id: false }
);

const serverStatsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    guildName: String,

    createdAt: { type: Date, default: Date.now },
    lookbackStart: {
      type: Date,
      default: () => Date.now() - 7 * 24 * 60 * 60 * 1000
    },

    // ===== GLOBAL HISTORY (LIMITED) =====
    messageHistory: {
      type: [
        {
          timestamp: Date,
          count: Number,
          userId: String,
          channelId: String
        }
      ],
      default: []
    },

    voiceHistory: {
      type: [
        {
          timestamp: Date,
          duration: Number,
          userId: String,
          channelId: String
        }
      ],
      default: []
    },

    // ===== USER STATS =====
    userMessages: {
      type: Object,
      default: {}
    },

    userVoice: {
      type: Object,
      default: {}
    },

    // ===== CHANNEL STATS =====
    channelMessages: {
      type: Object,
      default: {}
    },

    channelVoice: {
      type: Object,
      default: {}
    }
  },
  {
    minimize: false,
    versionKey: false // 🔥 disables __v → no VersionError
  }
);

module.exports = mongoose.model("ServerStats", serverStatsSchema);
