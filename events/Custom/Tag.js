const db = require("@data/prefix.js");
const { MessageFlags } = require("discord.js");

module.exports = {
  name: "Tag",
  run: async (client, message) => {
    const data = await db.findOne({ Guild: message.guildId });
    const prefix = data ? data.Prefix : client.prefix;
    const dabba = client
      .box()
      .text(`# Welcome to ${client.user.username} ${client.emoji.boticon}`)
      .sep()
      .text(
        `**Hey [${message.author.displayName}](${client.url(message.author.id)}),**\n` +
          `**I'm ${client.user.username}, your friendly bot.**\n` +
          `**Prefix for this server: \`${prefix}\`**\n` +
          `**Type \`${prefix}help\` for more information.**`
      )
      .sep()
      .text(
        `- -# **Want to support me? [Click here](${client.support})**\n` +
          `- -# **Want to invite me to your server? [Click here](${client.invite})**`
      )
      .sep()
      .media(client.icon);

    return message.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [dabba],
    });
  },
};
