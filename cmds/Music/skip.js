const { MessageFlags } = require(`discord.js`);

module.exports = {
  name: "skip",
  aliases: ["s"],
  category: "Music",
  cooldown: 3,
  description: "To skip the current playing song.",
  botPrams: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    if (
      player.queue.size == 0 &&
      !player.data.get("autoplay") &&
      !player.loop === "track"
    ) {
        const x = client.box().text(`Play a song first!`)
      message.reply({components: [x], flags: MessageFlags.IsComponentsV2});
    }
    await player.skip();

    const x = client.box().text(
      `${client.emoji.tick} | **Skipped** - [${player.queue.current.title}](${client.config.links.support})`,
    );
    return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
