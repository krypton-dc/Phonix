const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const Engine = require("@data/engine");
const { convertTime } = require("@utils/convert.js");

module.exports = {
  name: "play",
  category: "Music",
  aliases: ["p"],
  cooldown: 3,
  description: "Plays audio from YouTube, Spotify, etc.",
  args: true,
  usage: "Song URL or Name To Play",
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
        content: `I need \`CONNECT\` and \`SPEAK\` permissions in this channel.`,
      });
    }

    const query = args.join(" ");
    let searchEngine = "ytsearch";

    // Check if query contains a playlist link
    const isPlaylistLink = query.includes("playlist") || 
                          query.includes("album") || 
                          query.includes("sets") ||
                          /list=/i.test(query);

    // Only use engine system if it's NOT a playlist link
    if (!isPlaylistLink) {
      const settings = await Engine.find({
        $or: [{ userId: message.author.id }, { guildId: message.guild.id }],
      });
      
      const userSetting = settings.find((s) => s.userId === message.author.id);
      const guildSetting = settings.find((s) => s.guildId === message.guild.id);

      if (userSetting) {
        searchEngine = userSetting.engine;
      } else if (guildSetting) {
        searchEngine = guildSetting.engine;
      }
    }

    const player = await client.manager.createPlayer({
      guildId: message.guild.id,
      voiceId: channel.id,
      textId: message.channel.id,
      shardId: message.guild.shardId,
      volume: 80,
      deaf: true,
    });

    // Search without engine parameter if it's a playlist link
    const result = isPlaylistLink
      ? await player.search(query, { requester: message.author })
      : await player.search(query, { requester: message.author, engine: searchEngine });

    if (!result.tracks.length) {
      return message.reply({
        content: `${client.emoji.cross} | No result found for your query. Try changing your search engine.`,
      });
    }

    const tracks = result.tracks;
    let track;

    if (result.type === "PLAYLIST") {
      for (const t of tracks) player.queue.add(t);
      track = tracks[0];
    } else {
      track = tracks[0];
      player.queue.add(track);
    }

    const cleanedTitle = client.cleanTitle(track.title, track.author);
    const title = cleanedTitle;
    const endTime = Math.round((Date.now() + track.length) / 1000);

    if (!player.playing && !player.paused) player.play();

    const box = client
      .box()
      .text(`# ${client.emoji.music} Now Playing`)
      .sep()
      .text(`[${title}](${track.uri})`)
      .text(`Artist: ${track.author || "Unknown"}`)
      .text(
        `Requested By: [${message.author.username}](${client.url(message.author.id)})`
      )
      .sep()
      .text(`Duration: <t:${endTime}:R>`);

    const pl = client
      .box()
      .text(
        `Added **${tracks.length}** tracks from **${result.playlistName}** to the queue.`
      );

    return message.reply(
      result.type === "PLAYLIST"
        ? {
            flags: MessageFlags.IsComponentsV2,
            components: [pl],
          }
        : {
            flags: MessageFlags.IsComponentsV2,
            components: [box],
          }
    );
  },
};