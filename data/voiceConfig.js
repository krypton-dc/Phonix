const mongoose = require("mongoose");

const VoiceConfigSchema = new mongoose.Schema(
  {
    guildID: {
      type: String,
      required: true,
      index: true,
    },
    categoryID: {
      type: String,
      required: true,
    },
    channelID: {
      type: String,
      required: true,
    },

    logChannelID: {
      type: String,
      default: null,
    },

    cooldown: {
      type: Number,
      default: 0,
    },
    defaultUserLimit: {
      type: Number,
      default: 0,
    },

    allowedRoles: {
      type: [String],
      default: [],
    },
    voiceChannels: {
      type: Map,
      of: {
        ownerID: { type: String, required: true },
        name: { type: String, default: null },
        trustedUsers: { type: [String], default: [] },
        blockedUsers: { type: [String], default: [] },
        invitedUsers: { type: [String], default: [] },
        userLimit: { type: Number, default: 0 },
        privacy: {
          type: String,
          enum: ["public", "locked", "invisible"],
          default: "public",
        },
        region: { type: String, default: "auto" },
        isClaimable: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
      default: {},
    },

    autoDeleteEmptyVC: {
      type: Boolean,
      default: true,
    },

    transferOnLeave: {
      type: Boolean,
      default: true,
    },

    claimTimeout: {
      type: Number,
      default: 30,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    minimize: false,
  }
);

VoiceConfigSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("VoiceConfig", VoiceConfigSchema);
