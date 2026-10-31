const { model, Schema } = require("mongoose");

let antiBadwordSchema = new Schema({
  guildId: String,
  isEnabled: {
    type: Boolean,
    default: false,
  },
  badWords: {
    type: Array,
    default: [],
  },
  whitelistUsers: {
    type: Array,
    default: [],
  },
  whitelistRoles: {
    type: Array,
    default: [],
  },
  whitelistChannels: {
    type: Array,
    default: [],
  },
  action: {
    type: String,
    default: "delete", // delete, warn, log
  },
  punishment: {
    type: String,
    default: "none", // none, timeout, kick, ban
  },
  maxStrikes: {
    type: Number,
    default: 3,
  },
  strikes: {
    type: Array,
    default: [], // Structure: [{ userId: String, strikes: Number, lastStrike: Date }]
  },
  logChannel: {
    type: String,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = model("AntiBadword", antiBadwordSchema);
