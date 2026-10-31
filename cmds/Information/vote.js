const { MessageFlags, ButtonBuilder, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "vote",
  aliases: ["vote"],
  description: "Vote for the bot",
  category: "Information",
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const button = new ButtonBuilder()
      .setLabel("Vote")
      .setStyle("Link")
      .setURL("https://top.gg/bot/1089504577734311976/vote");
    const row = new ActionRowBuilder().addComponents(button);
      const x = client.box().text(`# <:topggpride:1429613553706467418> Vote Me On Top.GG`).sep().addActionRowComponents(row)
    message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
