const mongoose = require("mongoose");

const AutoReactSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  keyword: {
    type: String, // If null, it's a full-channel reaction
    default: null,
  },
  emoji: {
    type: String,
    required: true,
  },
  channelId: {
    type: String, // If null, it's a global trigger
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("AutoReact", AutoReactSchema);
