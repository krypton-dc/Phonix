const { MessageFlags } = require("discord.js");

module.exports = {
  name: "memberCount",
  description: "Shows the total member count of the server",
  category: "Information",
  usage: "membercount",
  aliases: ["mcount", "members", "mc"],
  execute: async (message, args, client) => {
    try {
      const { guild } = message;

      const total = guild.memberCount;
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;

      const x = client.box()
        .text(`# ${client.emoji.boticon} Member Count for ${guild.name}`)
        .sep()
        .text(`> <:user:1460695382773334259> Total Members:\n\`\`\`${total}\`\`\` `)
        .sep()
        .text(`> <:trust:1460695466634121279> Humans:\n\`\`\`${humans}\`\`\` `)
        .sep()
        .text(`> <:partner:1460695367828901979> Bots:\n\`\`\`${bots}\`\`\` `)
        .sep()
        .text(`Req By: ${message.author.username}`)

      await message.channel.send({ components: [x], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error(err);
      return message.channel.send("❌ Failed to fetch member count.");
    }
  }
};
