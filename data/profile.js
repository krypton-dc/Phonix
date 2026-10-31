const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  User: { type: String, required: true, unique: true },
  Bio: { type: String, default: "" },
  SocialMedia: {
    type: Map,
    of: new mongoose.Schema(
      {
        link: { type: String },
        username: { type: String },
      },
      { _id: false }
    ),
    default: {},
  },
  Badges: { type: [String], default: [] }, // example future upgrade
  Views: { type: Number, default: 0 }, // profile view counter
  LastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Profile", ProfileSchema);
