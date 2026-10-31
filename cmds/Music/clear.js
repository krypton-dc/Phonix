const { MessageFlags } = require("discord.js");

module.exports = {
  name: "clear",
  aliases: ["cq", "clear"],
  category: "Music",
  cooldown: 3,
  description: "Removes all songs in the music queue.",
  args: false,
  usage: "",
  userPerms: [],

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
    player.queue.clear();
    const thing = new client.embed().d(
      `${client.emoji.tick} Removed all songs from the queue.`
    );
    return message.reply({ embeds: [thing] });
  },
};
