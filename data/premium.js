const { Schema, model } = require("mongoose");

const premiumSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  premium: { type: Boolean, default: true },
  priceCurrency: { type: String, enum: ["INR", "Dollar"], required: true },
  tier: {
    type: String,
    enum: ["day", "week", "month", "year", "permanent"],
    required: true,
  },
  expiresAt: { type: Date, default: null },
  boostsUsed: { type: Number, default: 0 },
  boostedServers: { type: [String], default: [] },
});

module.exports = model("Premium", premiumSchema);
