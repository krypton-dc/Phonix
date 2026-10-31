const { EmbedBuilder } = require("discord.js");
const db = require("@data/playlist");

module.exports = {
  name: "savequeue",
  aliases: ["plsaveq", "saveq"],
  category: "Playlist",
  cooldown: 3,
  description: "Save current playing queue in your playlist.",
  args: false,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const Name = args[0];
    const player = client.manager.players.get(message.guild.id);

    const data = await db.find({
      UserId: message.author.id,
      PlaylistName: Name,
    });
    if (!data) {
      return message.reply({
        embeds: [
          new client.embed()
            .d(
              `${client.emoji.cross} Please enter the correct playlist name`
            ),
        ],
      });
    }
    if (data.length == 0) {
      return message.reply({
        embeds: [
          new client.embed()
            .d(
              `${client.emoji.cross} Please check the name and try again.`
            ),
        ],
      });
    }
    const song = player.queue.current;
    const tracks = player.queue;

    let oldSong = data.Playlist;
    if (!Array.isArray(oldSong)) oldSong = [];
    const newSong = [];
    if (player.queue.current) {
      newSong.push({
        title: song.title,
        uri: song.uri,
        author: song.author,
        duration: song.length,
      });
    }
    for (const track of tracks)
      newSong.push({
        title: track.title,
        uri: track.uri,
        author: track.author,
        duration: track.length,
      });
    const playlist = oldSong.concat(newSong);
    await db.updateOne(
      {
        UserId: message.author.id,
        PlaylistName: Name,
      },
      {
        $set: {
          Playlist: playlist,
        },
      }
    );
    const embed = new client.embed()
      .d(
        `${client.emoji.tick} | Added **${playlist.length - oldSong.length}** song in **${Name}**`
      );
    return message.channel.send({ embeds: [embed] });
  },
};
