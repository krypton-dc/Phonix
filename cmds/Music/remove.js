module.exports = {
  name: "remove",
  aliases: ["hata"],
  category: "Music",
  cooldown: 3,
  description: "Remove song from the queue",
  args: true,
  usage: "Number of song in queue",
  userPrams: [],
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

    const position = Number(args[0]) - 1;
    if (position > player.queue.length) {
      const number = position + 1;
      const thing = new client.embed()
        .d(
          `${client.emoji.cross} | No songs at number ${number}.\nTotal Songs: ${player.queue.length}`
        );
      return message.reply({ embeds: [thing] });
    }

    const song = player.queue[position];

    await player.queue.splice(position, 1);

    const emojieject = client.emoji.remove;

    const x = client.box()
      .text(
        `${client.emoji.tick} | Removed - [${client.cleanTitle(song.title)}](${client.config.links.support})`
      );
    return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
