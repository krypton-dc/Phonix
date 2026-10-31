const mongoose = require("mongoose");

// Define the Mongoose schema for the autoresponder
const autoresponderSchema = new mongoose.Schema({
  // The ID of the Discord guild (server) where this autoresponder is active.
  guildId: {
    type: String,
    required: true,
  },
  // The trigger word or phrase. It is converted to lowercase for case-insensitive matching.
  // We use `trim: true` to remove leading/trailing whitespace.
  trigger: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  // The response message that the bot will send when the trigger is detected.
  response: {
    type: String,
    required: true,
    trim: true,
  },
  // The timestamp when the autoresponder was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a unique index on `guildId` and `trigger` to prevent duplicate triggers in the same server.
// The `unique: true` option on `trigger` alone is not enough, as a trigger can exist in different guilds.
autoresponderSchema.index({ guildId: 1, trigger: 1 }, { unique: true });

// Create the Mongoose model from the schema
const Autoresponder = mongoose.model("Autoresponder", autoresponderSchema);

// Export the model so it can be used in other files.
module.exports = Autoresponder;
