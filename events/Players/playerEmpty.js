const { MessageFlags } = require(`discord.js`)
const db2 = require("@data/247");
const { autoplay } = require("@plugs/AutoPlay");

module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    player.data
      .get("message")
      ?.delete()
      .catch(() => null);

    if (player.data.get("autoplay")) {
      player.previous = player.data.get("autoplaySystem");
      return autoplay(player);
    }
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const TwoFourSeven = await db2.findOne({ Guild: player.guildId });

    const bar = TwoFourSeven ? client.emoji.tick : client.emoji.cross;

    if (TwoFourSeven) {
      client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `Type: ${client.prefix}p [song]` },
        })
        .catch(() => null);
        
        const x = client
        .box()
        .text(`# No more songs left to play`)
        .sep()
        .text(`> ___247: ${bar}___\n> ___Enjoying Music with me ?___\n> [___Consider Joining my Support server___](${client.config.links.support})`);
      client.channels.cache
        .get(player.textId)
        ?.send({
          components: [x
          ], flags: MessageFlags.IsComponentsV2
        })
        .catch(() => null);
    } else if (!TwoFourSeven) {
      client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `Type: ${client.prefix}p [song]` },
        })
        .catch(() => null);
        
        const x = client
        .box()
        .text(`# No more songs left to play`)
        .sep()
        .text(`> ___247: ${bar}___\n> ___Enjoying Music with me ?___\n> [___Consider Joining my Support server___](${client.config.links.support})`);
      client.channels.cache
        .get(player.textId)
        ?.send({
          components: [x
          ], flags: MessageFlags.IsComponentsV2
        })
        .catch(() => null);
    }
  },
};
