const { Schema, model } = require("mongoose");

const voiceRoleSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
    
  humanRole: {
    type: String,
    default: null,
  },
    
  botRole: {
    type: String,
    default: null,
  },
    
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

voiceRoleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = model("VoiceRole", voiceRoleSchema);
