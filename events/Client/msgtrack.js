const ServerStats = require("@data/ServerStats");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const now = new Date();
    const guildId = message.guild.id;
    const userId = message.author.id;
    const channelId = message.channel.id;

    await ServerStats.updateOne(
      { guildId },
      {
        $setOnInsert: {
          guildName: message.guild.name,
          createdAt: now
        },

        // === HISTORY (LIMITED) ===
        $push: {
          messageHistory: {
            $each: [
              {
                timestamp: now,
                count: 1,
                userId,
                channelId
              }
            ],
            $slice: -1000 // 🔥 keep last 1000 only
          },

          [`userMessages.${userId}.history`]: {
            $each: [{ timestamp: now, value: 1 }],
            $slice: -500
          },

          [`channelMessages.${channelId}.history`]: {
            $each: [{ timestamp: now, value: 1 }],
            $slice: -500
          }
        },

        // === METADATA ===
        $set: {
          [`userMessages.${userId}.username`]: message.author.username,
          [`channelMessages.${channelId}.name`]: message.channel.name
        }
      },
      { upsert: true }
    );
  }
};
