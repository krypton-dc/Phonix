const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "search",
  aliases: ["sr"],
  category: "Music",
  description: "Search and play music from YouTube, Spotify, or SoundCloud.",
  args: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  execute: async (message, args, client, prefix) => {
    const { channel } = message.member.voice;
    const query = args.join(" ");

    // Loading reply
    const o = client
      .box()
      .text(`${client.emoji.search} **Searching please wait...**`);
    const x = await message
      .reply({
        flags: MessageFlags.IsComponentsV2,
        components: [o],
      })
      .catch(() => {});

    // Create player
    const player = await client.manager.createPlayer({
      voiceId: channel.id,
      textId: message.channel.id,
      guildId: message.guild.id,
      shardId: message.guild.shardId,
      volume: 80,
      deaf: true,
    });

    // Try search on different providers
    const result = {};

    const trySearch = async (engine) => {
      try {
        const res = await player.search(query, {
          requester: message.author,
          engine,
        });
        return res?.tracks || [];
      } catch {
        return [];
      }
    };

    result.youtube = await trySearch("ytsearch");
    result.spotify = await trySearch("spsearch");
    result.soundcloud = await trySearch("scsearch");

    result.tracks = [
      ...result.youtube.slice(0, 5),
      ...result.spotify.slice(0, 5),
      ...result.soundcloud.slice(0, 5),
    ];

    if (!result.tracks.length) {
      const n = client.box().text(`${client.emoji.cross} **No results found**`);
      return x
        ? x
            .edit({
              flags: MessageFlags.IsComponentsV2,
              components: [n],
            })
            .catch(() => {})
        : message
            .reply({
              flags: MessageFlags.IsComponentsV2,
              components: [n],
            })
            .catch(() => {});
    }

    const tracks = result.tracks;

    // Build select menu options
    const options = tracks.map((track, index) => ({
      label: `${index + 1}. ${track.title.substring(0, 50)}`,
      value: `${index}`,
      description: `By: ${track.author.substring(0, 30)} | ${track.isStream ? "◉ LIVE" : client.tracktime(track.length)}`,
      emoji: client.emoji[track.sourceName] || "🎵",
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("menu")
      .setPlaceholder("Select a track")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);
    const got = client.box().text(`**Select a track below**`);
    got.addActionRowComponents(row);
    const m = x
      ? await x
          .edit({
            components: [got],
          })
          .catch(() => {})
      : await message
          .reply({
            components: [got],
          })
          .catch(() => {});

    // Collector
    const collector = m?.createMessageComponentCollector({
      filter: (interaction) => {
        if (interaction.user.id === message.author.id) return true;
        interaction
          .reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.cross} Only **${message.author.tag}** can use this`
              ),
            ],
            ephemeral: true,
          })
          .catch(() => {});
        return false;
      },
      time: 60000,
      idle: 30000,
    });

    collector?.on("end", async (collected) => {
      if (collected.size === 0) {
        const ok = client
          .box()
          .text(`${client.emoji.warn} **Timeout! No track selected**`);
        await m
          .edit({
            flags: MessageFlags.IsComponentsV2,
            components: [ok],
          })
          .catch(() => {});
      }
    });

    // Collect handler
    collector?.on("collect", async (interaction) => {
      if (!interaction.deferred) await interaction.deferUpdate();

      let dn;

      for (const value of interaction.values) {
        const song = tracks[value];
        await player.queue.add(song);

        dn = client
          .box()
          .text(
            `${client.emoji.tick} **Added [${song.title.replace(/\[|\]/g, "").substring(0, 50)}](${song.uri}) to queue**\n`
          );
      }

      await m
        .edit({
          flags: MessageFlags.IsComponentsV2,
          components: [dn], // clear menu/buttons
        })
        .catch(() => {});

      if (!player.playing && !player.paused) player.play();
    });
  },
};
