const UserStats = require("@data/UserStats");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const channelId = message.channel.id;
    const now = new Date();

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // === MAIN USER STATS ===
    await UserStats.updateOne(
      { userId, guildId },
      {
        $inc: {
          totalMessages: 1,
          [`channelActivity.${channelId}.messages`]: 1
        },
        $set: {
          username: message.author.username,
          lastActive: now
        },
        $setOnInsert: {
          joinedAt: message.member?.joinedAt
        }
      },
      { upsert: true }
    );

    // === DAILY ACTIVITY (SAFE) ===
    const dailyUpdate = await UserStats.updateOne(
      { userId, guildId, "dailyActivity.date": today },
      { $inc: { "dailyActivity.$.messages": 1 } }
    );

    // If today entry doesn't exist → push once
    if (dailyUpdate.matchedCount === 0) {
      await UserStats.updateOne(
        { userId, guildId },
        {
          $push: {
            dailyActivity: {
              $each: [
                {
                  date: today,
                  messages: 1,
                  voiceTime: 0
                }
              ],
              $slice: -30 // 🔥 keep last 30 days only
            }
          }
        }
      );
    }
  }
};
