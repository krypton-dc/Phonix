const mongoose = require("mongoose");

const userUsageSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  commandUsage: { type: Number, default: 0 },
  lastUsed: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserUsage", userUsageSchema);
