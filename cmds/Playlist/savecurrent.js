const { EmbedBuilder } = require("discord.js");
const db = require("@data/playlist");

module.exports = {
  name: "savecurrent",
  aliases: ["plsavec", "savec"],
  category: "Playlist",
  cooldown: 3,
  description: "Add current playing song in your saved playlist.",
  args: false,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],

  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const Name = args[0];
    if (!Name)
      return message.channel.send({
        embeds: [new client.embed().d(`Provide Me A Playlist Name`)],
      });
    const data = await db.findOne({
      UserId: message.author.id,
      PlaylistName: Name,
    });
    const player = client.manager.players.get(message.guild.id);
    if (!player.queue.current) {
      const thing = new client.embed()
        .setColor("2f3136")
        .setDescription(
          `${client.emoji.cross} | No song/s currently playing within this guild.`
        );
      return message.reply({ embeds: [thing] });
    }
    if (!data) {
      return message.reply({
        embeds: [
          new client.embed()
            .setColor("2f3136")
            .setDescription(
              `${client.emoji.cross} | You don't have a playlist with **${Name}** name`
            ),
        ],
      });
    }
    if (data.length == 0) {
      return message.reply({
        embeds: [
          new client.embed()
            .setColor("2f3136")
            .setDescription(
              `${client.emoji.cross} | You don't have a playlist with **${Name}** name`
            ),
        ],
      });
    }
    const song = player.queue.current;
    let oldSong = data.Playlist;
    if (!Array.isArray(oldSong)) oldSong = [];
    oldSong.push({
      title: song.title,
      uri: song.uri,
      author: song.author,
      duration: song.length,
    });
    await db.updateOne(
      {
        UserId: message.author.id,
        PlaylistName: Name,
      },
      {
        $push: {
          Playlist: {
            title: song.title,
            uri: song.uri,
            author: song.author,
            duration: song.length,
          },
        },
      }
    );
    const embed = new client.embed()
      .setColor("2f3136")
      .setDescription(
        `${client.emoji.tick} | Added [${song.title.substr(0, 256)}](${client.config.links.support}) in **${Name}**`
      );
    return message.channel.send({ embeds: [embed] });
  },
};
