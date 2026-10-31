const mongoose = require("mongoose");

const autoPfpSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  interval: { type: Number, default: 10000 }, // default: 10 sec
});

module.exports = mongoose.model("AutoPfp", autoPfpSchema);
