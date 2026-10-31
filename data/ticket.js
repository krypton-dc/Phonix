const mongoose = require("mongoose");

const ticketSetupSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true }, // Panel channel
  messageId: { type: String, required: true }, // Panel message
  categoryId: { type: String, required: true }, // Ticket category
  supportRoles: { type: [String], default: [] } // Staff role IDs
});

const ticketDataSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  ownerId: { type: String, required: true },
  closed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  TicketSetup: mongoose.model("TicketSetup", ticketSetupSchema),
  TicketData: mongoose.model("TicketData", ticketDataSchema)
};
