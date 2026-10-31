const { MessageFlags } = require("discord.js");

module.exports = {
  name: "shuffle",
  category: "Music",
  description: "Shuffle queue",
  cooldown: 3,
  args: false,
  botPrams: ["EmbedLinks"],
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
    const x = client.box()
      .text(`${client.emoji.tick} | Shuffled the queue`)
    await player.queue.shuffle();
    return message
      .reply({ components: [x], flags: MessageFlags.IsComponentsV2})
      .catch((error) => client.logger.log(error, "error"));
  },
};
