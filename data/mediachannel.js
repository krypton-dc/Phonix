const mongoose = require("mongoose");

const MediaChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channels: { type: [String], default: [] },
});

module.exports = mongoose.model("MediaChannel", MediaChannelSchema);
