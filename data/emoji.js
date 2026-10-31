const { Schema, model } = require("mongoose");

const emojiSchema = new Schema({
  userId: { type: String, required: true, unique: true }, // user who created backup
  guildId: { type: String, required: true }, // server being backed up
  guildName: { type: String, required: true, default: "Phonix" },
  emojiLength: { type: Number, required: true, default: 0 },
  emojis: { type: Array, required: true, default: [] },
});

module.exports = model("Emoji", emojiSchema);
