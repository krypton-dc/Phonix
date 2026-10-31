const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "webhooksUpdate",
    run: async (c, channel) =>
      await handleAntinukeAction(
        c,
        channel.guild,
        AuditLogEvent.WebhookUpdate,
        "webhooksUpdate",
        channel
      ),
  },
  {
    name: "webhookCreate",
    run: async (c, webhook) =>
      await handleAntinukeAction(
        c,
        webhook.guild,
        AuditLogEvent.WebhookCreate,
        "webhookCreate",
        webhook
      ),
  },
  {
    name: "webhookDelete",
    run: async (c, webhook) =>
      await handleAntinukeAction(
        c,
        webhook.guild,
        AuditLogEvent.WebhookDelete,
        "webhookDelete",
        webhook
      ),
  },
];
