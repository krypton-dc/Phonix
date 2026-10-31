const mongoose = require("mongoose");

const presetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  cardPath: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Preset", presetSchema);
