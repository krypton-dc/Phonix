const { MessageFlags } = require("discord.js");

module.exports = {
  name: "leave",
  aliases: ["dc"],
  category: "Music",
  cooldown: 3,
  description: "Leave voice channel",
  usage: "",
  botPrams: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    if (!player) {
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
      
    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, { body: { status: `` } })
      .catch(() => null);
    await player.destroy(message.guild.id);
       client.dcTriggered = message.guild.id;
    await player.data.set("autoplay", false);

    const x = client.box()
      .text(`**${client.emoji.tick} Leaved the voice channel**`).sep().text(`-# Req By: ${message.author.username}`);
    return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2});
  },
};
