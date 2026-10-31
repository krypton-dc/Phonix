const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "guildMemberAdd",
    run: async (client, member) => {
      if (member.user.bot) {
        await handleAntinukeAction(client, member.guild, AuditLogEvent.BotAdd, "botAdd", member);
      }
    },
  },
];
