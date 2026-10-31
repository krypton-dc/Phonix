const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  developer: { type: [String], default: [] },
  owner: { type: [String], default: [] },
  manager: { type: [String], default: [] },
  staff: { type: [String], default: [] },
  admin: { type: [String], default: [] },
});

module.exports = mongoose.model("Team", teamSchema);
