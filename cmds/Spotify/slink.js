const { MessageFlags } = require('discord.js');
const UserLink = require('@data/UserLink');
const spotifyManager = require('@plugs/SpotifyManager');

module.exports = {
  name: 'slink',
  description: 'Link your Spotify profile to access your public playlists',
  usage: 'link <spotify profile URL>',
  aliases: ['spotify-link', 'connect-spotify'],
  category: 'Spotify',
  cooldown: 5,
  voteonly: false,

  execute: async (message, args, client, prefix) => {

    try {
      // Validate arguments
      if (!args?.length) {
          const b = client.box().text('# Missing Spotify URL').sep().text(`> Provide your Spotify profile URL.\n\nUsage: \`${prefix}link <spotify profile URL>\``)
        return message.reply({
          components: [b], flags: MessageFlags.IsComponentsV2
        });
      }

      const profileUrl = args[0].trim();
      const parsed = spotifyManager.parseSpotifyUrl(profileUrl);

      if (!parsed || parsed.type !== 'user') {
          const u = client.box().text('Invalid Spotify URL').sep().text(`Please provide a valid Spotify profile URL.\nExample: \`https://open.spotify.com/user/your_username\``)
        return message.reply({ components: [u], flags: MessageFlags.IsComponentsV2
        });
      }

      // Loading message
        const xx = client.box().text('Verifying Spotify Profile...').sep().text('Connecting to Spotify. Please wait while we verify your account.')
      const loading = await message.reply({
        components: [xx], flags: MessageFlags.IsComponentsV2
      });

      // Fetch user info
      const userData = await spotifyManager.fetchUserData(profileUrl);
      if (!userData) {
          const a = client.box().text('Profile Not Found').sep().text('Could not locate that Spotify profile. Please double-check the URL and try again.')
        return loading.edit({
          components: [a], flags: MessageFlags.IsComponentsV2 
        });
      }

      // Save to DB
      await UserLink.updateOne(
        { discordUserId: message.author.id },
        {
          $set: {
            spotifyUserId: userData.id,
            spotifyDisplayName: userData.displayName,
            spotifyProfileUrl: userData.url,
            linkedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Fetch playlists
      let playlistCount = 0;
      try {
        const playlists = await spotifyManager.fetchUserPlaylists(profileUrl);
        if (Array.isArray(playlists)) playlistCount = playlists.length;
      } catch (err) {
        client.logger.log(`Failed to fetch playlists: ${err?.message}`, 'warn');
      }

      // Success message
      const successMsg = [
        `Successfully linked to Spotify profile: **${userData.displayName}**`,
        playlistCount > 0
          ? `\n\nFound **${playlistCount}** public playlist${playlistCount > 1 ? 's' : ''}. Use \`${prefix}playlists\` to view them.`
          : `\n\nNo public playlists found. Set your playlists to public to use them with this bot.`,
      ].join('');

        const i = client.box().text('# Spotify Linked').sep().text(successMsg).text(`-# Linked by ${message.author.tag}`)
      return loading.edit({
        components: [i], flags: MessageFlags.IsComponentsV2
      });

    } catch (err) {
      client.logger.log(`Command error (link-spotify): ${err.message}`, 'error');
      return message.reply({
        embeds: [new client.embed().t('Error').d('An unexpected error occurred while linking your Spotify profile. Please try again later.')],
      });
    }
  },
};

// Utility helper
function hexToInt(hex) {
  return Number.parseInt(hex.replace('#', ''), 16) || 0x2f3136;
}
