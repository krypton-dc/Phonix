const {
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "previous",
  category: "Music",
  aliases: ["prev", "back"],
  cooldown: 3,
  description: "Plays the previous track from the queue.",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const { channel } = message.member.voice;

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve(["Speak", "Connect"])
      )
    ) {
      return message.channel.send({
        content: "I need `CONNECT` and `SPEAK` permissions in this channel.",
      });
    }

    const player = client.manager.players.get(message.guild.id);

    // Get the previous track from the queue
    const prevTrack = player.queue.previous;
    if (!prevTrack) {
      return message.reply({
        content: `${client.emoji.cross} | No previous track to play!`,
      });
    }

    // Add previous track back to queue and play
    player.queue.add(prevTrack, true); // add at front, or simply call play if your system allows
    player.queue.clear();

    // Discord-styled info box
    const cleanedTitle = client.cleanTitle(prevTrack.title, prevTrack.author);
    const box = client
      .box()
      .text(`${client.emoji.music} Playing Previous Song`)
      .sep()
      .text(`[${cleanedTitle}](${prevTrack.uri})`)
      .text(`Artist: ${prevTrack.author || "Unknown"}`)
      .sep()
      .text(`Duration: ${convertTime(prevTrack.length)}`);

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });
  },
};
