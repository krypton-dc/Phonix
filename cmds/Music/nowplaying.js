const { AttachmentBuilder } = require("discord.js");
const Preset = require("@data/preset")
const path = require("node:path");


module.exports = {
  name: "nowplaying",
  aliases: ["np"],
  category: "Music",
  description: "Show now playing song",
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  botPrams: ["EmbedLinks"],
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    const song = player.queue.current;

    if (!player.queue.current) {
      const thing = new client.embed().d(
        `${client.emoji.cross} | No song/s currently playing within this guild.`
      );

      return message.channel.send({ embeds: [thing] });
    }

    const title = client.cleanTitle(song.title)
    const requester = song.requester;
    const author = song.author;
    const total = song.length;
    const current = player.position;
    const source = song.sourceName;
    const thumbnail = song.thumbnail;
    const presetDoc = await Preset.findOne({ userId: requester.id });
    const cardPath = presetDoc?.cardPath || "../../custom/presets/card2.js";
    const resolvedCardPath = path.resolve(__dirname, cardPath);
      
      const elapsed = current;
      const progress = Math.min((elapsed / total) * 100, 100);
      const currentTimeFormatted = client.tracktime(elapsed);
      const durationFormatted = client.tracktime(total);
      let buildCard;
      buildCard = require(resolvedCardPath);
      
        const np = await buildCard({
          title,
          author,
          thumbnail,
          startTime: currentTimeFormatted,
          endTime: durationFormatted,
          requester: requester.displayName,
          progressPercent: progress,
          source,
        });
        const updatedAttachment = new AttachmentBuilder(np, {
          name: "nowplaying.png",
        });
    return message.channel.send({ /* embeds: [embed], */ files: [updatedAttachment] });
},
};