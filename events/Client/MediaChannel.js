const MediaChannel = require("@data/mediachannel");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    try {
      if (!message.guild || message.author.bot || message.attachments.size > 0)
        return;

      const data = await MediaChannel.findOne({
        guildId: message.guild.id,
      });

      if (!data || !data.channels.includes(message.channel.id)) return;

      await message.delete().catch(() => {});

      const warn = await message.channel.send({
        content:
          "> This channel only allows messages with attachments.\n-# Text messages are removed automatically.",
      });

      setTimeout(() => warn.delete().catch(() => {}), 4000);
    } catch {
      null;
    }
  },
};
