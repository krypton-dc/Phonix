const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonStyle,
  SelectMenuBuilder,
  ButtonBuilder,
} = require("discord.js");

module.exports = {
  name: "avatar",
  category: "Information",
  aliases: ["av"],
  cooldown: 3,
  description: "shows user avatar with buttons",
  args: false,
  usage: "",
  permission: [],

  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first() || message.author;
    const embed = new client.embed()
      .setAuthor({
        name: user.tag,
        iconURL: user.displayAvatarURL({ dynamic: true }),
      })
      .setFooter({
        text: "Requested by " + message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setImage(user.displayAvatarURL({ dynamic: true, size: 2048 }));
    message.reply({ embeds: [embed] });
  },
};
