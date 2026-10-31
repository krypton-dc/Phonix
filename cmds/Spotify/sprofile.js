const { MessageFlags } = require('discord.js');
const UserLink = require('@data/UserLink');

module.exports = {
  name: 'sprofile',
  description: 'Show your linked Spotify profile',
  usage: 'spotify-profile',
  aliases: ['spr'],
  category: 'Spotify',
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    const doc = await UserLink.findOne({ discordUserId: message.author.id });
    if (!doc) {
      return message.reply(
        'No Spotify profile linked yet. Use `' + prefix + 'link-spotify <url>` to link.'
      );
    }

    const x = client.box()
      .text(`# ${client.emoji.spotify} Spotify Profile`)
      .sep()
      .text(
        `> ${client.emoji.dot} Name: **${doc.spotifyDisplayName}**\n> ${client.emoji.dot} Linked: <t:${Math.floor(
          new Date(doc.linkedAt).getTime() / 1000
        )}:R>`
      )
          .text(`-# Req By: ${message.author.username}`);

    return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
