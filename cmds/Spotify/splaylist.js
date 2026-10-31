const { MessageFlags } = require('discord.js');
const UserLink = require('@data/UserLink');
const spotifyManager = require('@plugs/SpotifyManager');

module.exports = {
  name: 'splaylist',
  category: 'Spotify',
  aliases: ['splist'],
  cooldown: 3,
  description: 'Show your linked Spotify public playlists',
  args: false,
  usage: 'splaylists',
  userPrams: [],
  botPrams: ['EmbedLinks'],
  owner: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,

  execute: async (message, args, client, prefix) => {
    try {
      const link = await UserLink.findOne({ discordUserId: message.author.id });
      if (!link) {
          const f = client.box().text(`No Spotify profile linked.\nLink one with \`${prefix}link-spotify <spotify profile url>\`.`)
        return message.reply({
          components: [f], flags: MessageFlags.IsComponentsV2
        });
      }

      const playlists = await spotifyManager.fetchUserPlaylists(link.spotifyProfileUrl);
      if (!Array.isArray(playlists) || playlists.length === 0) {
          const l = client.box().text('No public playlists found on your Spotify profile.')
        return message.reply({
          components: [l], flags: MessageFlags.IsComponentsV2
        });
      }

      const show = playlists.slice(0, 10);
      const lines = show.map((p, i) => `• [${i + 1}] ${p.name} (${p.trackCount} tracks)`);

        const embed = client.box().text(`Public Playlists for ${link.spotifyDisplayName || message.author.username}`).sep().text(`${lines.join('\n')}\n\nTo play one: \`${prefix}playplist <number>\`\n`)

      return message.reply({ components: [embed], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
        console.error(err)
    }
  },
};
