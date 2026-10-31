const mongoose = require("mongoose");

const songUsageSchema = new mongoose.Schema({
  songName: { type: String, required: true, index: true },
  songUrl: { type: String, required: false },
  playCount: { type: Number, default: 0 },
  lastPlayed: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SongUsage", songUsageSchema);
