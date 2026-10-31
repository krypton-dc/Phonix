const ServerStats = require("@data/ServerStats");

const voiceSessions = new Map();

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    try {
      // SAFE member resolution
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const userId = member.id;
      const guildId = member.guild.id;
      const now = new Date();

      /* ===== USER JOIN ===== */
      if (!oldState.channel && newState.channel) {
        voiceSessions.set(userId, {
          joinedAt: now,
          channelId: newState.channel.id
        });
        return;
      }

      /* ===== USER LEAVE ===== */
      if (oldState.channel && !newState.channel) {
        const session = voiceSessions.get(userId);
        if (!session) return;

        const duration = now - session.joinedAt;
        if (duration < 1000) {
          voiceSessions.delete(userId);
          return;
        }

        await ServerStats.updateOne(
          { guildId },
          {
            $setOnInsert: {
              guildName: member.guild.name,
              createdAt: now
            },

            /* ===== HISTORY (LIMITED) ===== */
            $push: {
              voiceHistory: {
                $each: [
                  {
                    timestamp: now,
                    duration,
                    userId,
                    channelId: session.channelId
                  }
                ],
                $slice: -1000
              },

              [`userVoice.${userId}.history`]: {
                $each: [{ timestamp: now, value: duration }],
                $slice: -500
              },

              [`channelVoice.${session.channelId}.history`]: {
                $each: [{ timestamp: now, value: duration }],
                $slice: -500
              }
            },

            /* ===== METADATA ===== */
            $set: {
              [`userVoice.${userId}.username`]: member.user.username,
              [`channelVoice.${session.channelId}.name`]:
                oldState.channel?.name || "Unknown"
            }
          },
          { upsert: true }
        );

        voiceSessions.delete(userId);
      }
    } catch (err) {
      client.logger?.log(
        `Voice Tracker Error: ${err.stack || err}`,
        "error"
      );
    }
  }
};
