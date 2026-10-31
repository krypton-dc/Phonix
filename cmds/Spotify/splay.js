const { MessageFlags, PermissionsBitField } = require('discord.js');
const UserLink = require('@data/UserLink');
const spotifyManager = require('@plugs/SpotifyManager');

module.exports = {
  name: 'splay',
  category: 'Spotify',
  aliases: ['sp'],
  cooldown: 5,
  description: 'Play all tracks from one of your Spotify public playlists by number',
  args: true,
  usage: 'playplist <number>',
  userPrams: [],
  botPrams: ['EmbedLinks', 'Connect', 'Speak'],
  owner: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  execute: async (message, args, client, prefix) => {
    const { channel } = message.member.voice;

    if (!args[0] || isNaN(args)) {
        const x = client.box().text(`Usage: \`${prefix}playplist <number>\``)
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }
    const index = parseInt(args, 10);
      const v = client.box().text('Invalid number.').sep()
    if (index < 1) return message.reply({ components: [v], flags: MessageFlags.IsComponentsV2 });

    const link = await UserLink.findOne({ discordUserId: message.author.id });
    if (!link) {
        const h = client.box().text(`No Spotify profile linked.\nUse \`${prefix}link-spotify <profile_url>\` first.`)
      return message.reply({
        components: [h], flags: MessageFlags.IsComponentsV2 
      });
    }

    const playlists = await spotifyManager.fetchUserPlaylists(link.spotifyProfileUrl);
    if (!Array.isArray(playlists) || playlists.length === 0) {
        const l = client.box().text('No public playlists found.')
      return message.reply({ components: [l], flags: MessageFlags.IsComponentsV2 });
    }
    if (index > playlists.length) {
        const g = client.box().text(`There are only ${playlists.length} playlists.`)
      return message.reply({ embeds: [g], flags: MessageFlags.IsComponentsV2 });
    }

    const chosen = playlists[index - 1];

    const player = await client.manager.createPlayer({
      guildId: message.guild.id,
      voiceId: channel.id,
      textId: message.channel.id,
      volume: 80,
      deaf: true,
    });

      const p = client.box().text('Queueing Playlist').sep().text(`Fetching tracks from: ${chosen.name}`)
    const loading = await message.reply({
      components: [p], flags: MessageFlags.IsComponentsV2
    });

    const tracks = await spotifyManager.fetchPlaylistTracks(chosen.id, 300);
    if (!tracks.length) {
        const t = client.box().text('No playable tracks in that playlist.')
      return loading.edit({ embeds: [t], flags: MessageFlags.IsComponentsV2 });
    }

    const source = client.config?.node_source || 'ytsearch';
    let added = 0;
    const limit = Math.min(tracks.length, 100);

    for (let i = 0; i < limit; i++) {
      const t = tracks[i];
      const query = `${t.artist} - ${t.name}`;
      try {
        const res = await player.search(query, { requester: message.author, source });
        if (res?.tracks?.length) {
          player.queue.add(res.tracks[0]);
          added++;
        }
      } catch (e) {
        client.logger.log(`Search failed for "${query}": ${e?.message || e}`, 'warn');
      }
    }

    if (!player.playing && !player.paused) player.play();

      const k = client.box().text('Playlist Queued').sep().text(`Queued ${added}/${limit} tracks from "${chosen.name}".`)
    return loading.edit({
      components: [k], flags: MessageFlags.IsComponentsV2 
    });
  },
};
