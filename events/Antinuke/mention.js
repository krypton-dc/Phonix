const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "messageCreate",
    run: async (client, message) => {
      if (!message.guild) return;
      if (message.mentions.everyone) {
        await handleAntinukeAction(
          client,
          message.guild,
          null,
          "everyoneMention",
          message.author,
          message,
        );
      }
    },
  },
];
