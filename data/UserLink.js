const mongoose = require('mongoose');

const UserLinkSchema = new mongoose.Schema(
  {
    discordUserId: { type: String, required: true, unique: true, index: true },
    spotifyUserId: { type: String, required: true },
    spotifyDisplayName: { type: String, required: true },
    spotifyProfileUrl: { type: String, required: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserLink', UserLinkSchema);
