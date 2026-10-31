const { MessageFlags } = require('discord.js');
const UserLink = require('@data/UserLink');

module.exports = {
  name: 'unlink',
  category: 'Spotify',
  aliases: ['spotify-unlink', 'disconnect-spotify', 'unlinks'],
  cooldown: 3,
  description: 'Unlink your Spotify profile from your Discord account',
  args: false,
  usage: 'unlink',
  userPrams: [],
  botPrams: ['EmbedLinks'],
  owner: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,

  execute: async (message, args, client, prefix) => {
    try {
      const doc = await UserLink.findOne({ discordUserId: message.author.id });

      if (!doc) {
          const t = client.box().text(`No Spotify profile is currently linked.\nLink one with \`${prefix}link-spotify <spotify profile url>\`.`)
        return message.reply({
          components: [t], flags: MessageFlags.IsComponentsV2 
        });
      }

      await UserLink.deleteOne({ discordUserId: message.author.id });

        const q = client.box().text('Your Spotify profile has been unlinked successfully.');
      return message.reply({
        components: [q], flags: MessageFlags.IsComponentsV2 
      });
    } catch (err) {
        console.error(err)
    }
  },
};
