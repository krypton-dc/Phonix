const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "guildUpdate",
    run: async (client, oldGuild, newGuild) => {
      try {
        await handleAntinukeAction(client, newGuild, AuditLogEvent.GuildUpdate, "guildUpdate", newGuild);
      } catch (err) {
        console.error("[Antinuke] guildUpdate error:", err);
      }
    },
  },
];
