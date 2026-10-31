const mongoose = require('mongoose');

const antiSpamSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  isEnabled: {
    type: Boolean,
    default: false
  },
  messageThreshold: {
    type: Number,
    default: 5,
    min: 2,
    max: 20
  },
  timeframe: {
    type: Number,
    default: 5,
    min: 1,
    max: 60
  },
  punishment: {
    type: String,
    enum: ['mute', 'kick', 'ban', 'timeout', 'warn'],
    default: 'mute'
  },
  muteRole: {
    type: String,
    default: null
  },
  muteDuration: {
    type: Number,
    default: 300, // 5 minutes in seconds
    min: 60,
    max: 86400 // 24 hours max
  },
  timeoutDuration: {
    type: Number,
    default: 300, // 5 minutes in seconds
    min: 60,
    max: 2419200 // 28 days max (Discord limit)
  },
  whitelistUsers: [{
    type: String
  }],
  whitelistRoles: [{
    type: String
  }],
  whitelistChannels: [{
    type: String
  }],
  logChannel: {
    type: String,
    default: null
  },
  deleteMessages: {
    type: Boolean,
    default: true
  },
  warningMessage: {
    type: String,
    default: "{user}, spamming is not allowed."
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AntiSpam', antiSpamSchema);