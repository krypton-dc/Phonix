const AutoReact = require("@data/autoreact");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;
    const reactions = await AutoReact.find({ guildId: message.guild.id });
    if (!reactions.length) return;
    for (const react of reactions) {
      if (react.channelId && message.channel.id !== react.channelId) continue;
      if (react.keyword) {
        if (
          message.content.toLowerCase().includes(react.keyword.toLowerCase())
        ) {
          message.react(react.emoji).catch(() => null);
        }
      } else {
        message.react(react.emoji).catch(() => null);
      }
    }
  },
};
