const { MessageFlags } = require("discord.js");

module.exports = {
  name: "skipto",
  aliases: ["jump"],
  category: "Music",
  description: "Forward song",
  args: true,
  usage: "<Number of song in queue>",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  dj: true,

  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const me = client
        .box()
        .text(`Im Not Playing Any Song!`)
        .sep()
        .text(`Use \`${prefix}play\` to play a song!`);
      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [me],
      });
    }

    const position = Number(args[0]);
    if (args[0] == 1) player.skip();

    player.queue.splice(0, position - 1);
    await player.skip();

    const x = client.box()
      .text(`${client.emoji.tick} | Forward **${position}** Songs`);
    return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2});
  },
};
