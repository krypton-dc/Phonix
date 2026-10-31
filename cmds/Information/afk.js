const { MessageFlags } = require(`discord.js`);
const db = require("@data/afk");

module.exports = {
  name: "afk",
  category: "Information",
  aliases: ["busy"],
  cooldown: 3,
  description: "Set AFK status for the user",
  execute: async (message, args, client) => {
    const reason = args.join(" ") || "I'm AFK :)";
      const xx = client.box().text(`> You Cannot Add This Shit On Afk Kid`);
      
      const shits = ['discordapp.com', 'discord.gg/', 'https://discord.gg/', 'https://', '@everyone', '@here']
      if (shits.some(word => reason.includes(word))) {
          return message.channel.send({ components: [xx], flags: MessageFlags.IsComponentsV2 })
      }
      if (message.mentions.users.size > 0) {
          return message.channel.send({ components: [xx], flags: MessageFlags.IsComponentsV2 })
      }
    await db.create({
      Guild: message.guildId,
      Member: message.author.id,
      Reason: reason,
      Time: Date.now(),
    });
      const x = client.box().text(`Your AFK is now set to: **${reason}**`);
    message.channel.send({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
