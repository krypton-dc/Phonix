const mongoose = require("mongoose");

const LoggingSchema = new mongoose.Schema({
  Guild: String,
  Enabled: { type: Boolean, default: false },
  Types: { type: Object, default: {} },
});

module.exports.LoggingSetup = mongoose.model("LoggingSetup", LoggingSchema);
