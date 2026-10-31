const UserStats = require("@data/UserStats");

// key = `${guildId}:${userId}`
const voiceSessions = new Map();

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const userId = member.id;
      const guildId = member.guild.id;
      const key = `${guildId}:${userId}`;
      const now = Date.now();

      /* =========================
         USER JOINED VC
      ========================= */
      if (!oldState.channelId && newState.channelId) {
        voiceSessions.set(key, {
          joinedAt: now,
          channelId: newState.channelId,
        });
        return;
      }

      /* =========================
         USER LEFT VC
      ========================= */
      if (oldState.channelId && !newState.channelId) {
        const session = voiceSessions.get(key);
        if (!session) return;

        voiceSessions.delete(key);

        const duration = now - session.joinedAt;
        if (duration < 1000) return; // 🔥 ignore noise

        // Normalize today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        /* =========================
           MAIN USER UPDATE
        ========================= */
        await UserStats.updateOne(
          { userId, guildId },
          {
            $inc: { totalVoiceTime: duration },
            $set: {
              username: member.user.username,
              lastActive: now,
            },
            $setOnInsert: {
              joinedAt: member.joinedAt,
            },
          },
          { upsert: true }
        );

        /* =========================
           DAILY ACTIVITY (SAFE)
        ========================= */
        const dailyRes = await UserStats.updateOne(
          { userId, guildId, "dailyActivity.date": today },
          { $inc: { "dailyActivity.$.voiceTime": duration } }
        );

        if (dailyRes.matchedCount === 0) {
          await UserStats.updateOne(
            { userId, guildId },
            {
              $push: {
                dailyActivity: {
                  $each: [
                    {
                      date: today,
                      messages: 0,
                      voiceTime: duration,
                    },
                  ],
                  $slice: -30, // 🔥 keep last 30 days
                },
              },
            }
          );
        }

        /* =========================
           CHANNEL ACTIVITY
        ========================= */
        const channelKey = `channelActivity.${session.channelId}`;

        await UserStats.updateOne(
          { userId, guildId },
          {
            $inc: {
              [`${channelKey}.voiceTime`]: duration,
            },
            $set: {
              [`${channelKey}.channelId`]: session.channelId,
            },
          }
        );
      }
    } catch (err) {
      client.logger?.log(
        `voiceStateUpdate error: ${err.stack || err}`,
        "error"
      );
    }
  },
};
