const mongoose = require("mongoose");

const giveawaySchema = new mongoose.Schema({
  // The ID of the guild where the giveaway is running
  guildId: {
    type: String,
    required: true,
  },
  // The ID of the channel where the giveaway message is located
  channelId: {
    type: String,
    required: true,
  },
  // The ID of the giveaway message itself
  messageId: {
    type: String,
    required: true,
    unique: true, // Each giveaway message should be unique
  },
  // The prize for the giveaway
  prize: {
    type: String,
    required: true,
  },
  // How many winners will be chosen
  winnerCount: {
    type: Number,
    required: true,
  },
  // The user ID of the person who started the giveaway
  hostedBy: {
    type: String,
    required: true,
  },
  // The user IDs of all participants
  entries: {
    type: [String],
    default: [],
  },
  // When the giveaway was started
  startAt: {
    type: Date,
    default: Date.now,
  },
  // When the giveaway is scheduled to end
  endAt: {
    type: Date,
    required: true,
  },
  // Whether the giveaway has ended and winners have been drawn
  ended: {
    type: Boolean,
    default: false,
  },
  // The ID of the role required to enter the giveaway (optional)
  requiredRole: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("Giveaway", giveawaySchema);
