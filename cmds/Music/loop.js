const { MessageFlags } = require("discord.js");

module.exports = {
  name: "loop",
  aliases: ["loop"],
  category: "Music",
  cooldown: 3,
  description: "Toggle music loop",
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

    if (player.setLoop(player.loop === "none" ? "track" : "none") && !args[0]) {
      const sexy = player.loop === "none" ? "Disabled" : "Enabled";
      const x = new client.embed().text(
        `${client.emoji.loop} | Loop track is now **${sexy}**`
      );
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }
    if (["q", "queue"].includes(args[0])) {
      await player.setLoop("queue");
      const x = client.box().text(`${client.emoji.loop} | Loop queue is now **Enabled**`);
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2});
    }
  },
};
