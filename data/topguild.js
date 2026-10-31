const mongoose = require("mongoose");

const guildUsageSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  commandUsage: { type: Number, default: 0 },
  lastUsed: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GuildUsage", guildUsageSchema);
