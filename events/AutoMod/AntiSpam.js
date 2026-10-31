const AntiSpam = require("@data/antispam");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot || message.system) return;
    try {
      const antiSpamData = await AntiSpam.findOne({
        guildId: message.guild.id,
      });
      if (!antiSpamData || !antiSpamData.isEnabled) return;

      const userId = message.author.id;
      const channelId = message.channel.id;
      if (
        antiSpamData.whitelistChannels &&
        antiSpamData.whitelistChannels.includes(channelId)
      )
        return;
      if (
        antiSpamData.whitelistUsers &&
        antiSpamData.whitelistUsers.includes(userId)
      )
        return;
      if (
        antiSpamData.whitelistRoles &&
        message.member.roles.cache.some((role) =>
          antiSpamData.whitelistRoles.includes(role.id)
        )
      )
        return;
      if (!client.spamMap) client.spamMap = new Map();
      if (!client.spamWarnings) client.spamWarnings = new Map();

      const userMessages = client.spamMap.get(userId) || [];
      const currentTime = Date.now();
      const timeframe = (antiSpamData.timeframe || 5) * 1000;
      const messageThreshold = antiSpamData.messageThreshold || 5;
      userMessages.push(currentTime);
      const recentMessages = userMessages.filter(
        (time) => currentTime - time <= timeframe
      );
      client.spamMap.set(userId, recentMessages);
      if (recentMessages.length >= messageThreshold) {
        const userWarnings = client.spamWarnings.get(userId) || {
          count: 0,
          lastWarning: 0,
        };

        await message.delete().catch(() => {});
        const warningCooldown = 60000;
        if (currentTime - userWarnings.lastWarning > warningCooldown) {
          userWarnings.count++;
          userWarnings.lastWarning = currentTime;
          client.spamWarnings.set(userId, userWarnings);
          const warningMsg = await message.channel
            .send({
              content: `${message.author}, spamming is not allowed.`,
            })
            .catch(() => {});
          if (warningMsg) {
            setTimeout(() => {
              warningMsg.delete().catch(() => {});
            }, 5000);
          }
          const member = message.member;
          if (member && antiSpamData.punishment) {
            try {
              switch (antiSpamData.punishment) {
                case "mute":
                  if (antiSpamData.muteRole) {
                    await member.roles.add(antiSpamData.muteRole);
                    if (antiSpamData.muteDuration) {
                      setTimeout(async () => {
                        try {
                          await member.roles.remove(antiSpamData.muteRole);
                        } catch (error) {
                          console.log(
                            "Failed to auto-unmute user:",
                            error.message
                          );
                        }
                      }, antiSpamData.muteDuration * 1000);
                    }
                  }
                  break;

                case "kick":
                  if (userWarnings.count >= 3) {
                    await member.kick("Anti-spam: Multiple spam violations");
                  }
                  break;

                case "ban":
                  if (userWarnings.count >= 3) {
                    await member.ban({
                      reason: "Anti-spam: Multiple spam violations",
                      deleteMessageDays: 1,
                    });
                  }
                  break;

                case "timeout":
                  await member.timeout((antiSpamData.timeoutDuration || 300) * 1000, "Anti-spam violation");
                  break;
              }
            } catch (error) {
              console.log("Failed to apply punishment:", error.message);
            }
          }

          // Log the incident
          if (antiSpamData.logChannel) {
            const isAdmin = message.member?.permissions.has("Administrator");
            const isModerator = message.member?.permissions.has([
              "KickMembers",
              "BanMembers",
              "ManageMessages",
            ]);
            const botMember = message.guild.members.cache.get(client.user.id);
            const canManageUser = botMember.roles.highest.position > message.member.roles.highest.position;

            const logChannel = message.guild.channels.cache.get(
              antiSpamData.logChannel
            );
            if (logChannel) {
              const embed = {
                color: 0xff0000,
                title: "🚫 Anti-Spam Triggered",
                fields: [
                  {
                    name: "User",
                    value: `${message.author} (${message.author.id})`,
                    inline: true,
                  },
                  {
                    name: "Channel",
                    value: `${message.channel}`,
                    inline: true,
                  },
                  {
                    name: "Messages in Timeframe",
                    value: `${recentMessages.length}/${messageThreshold}`,
                    inline: true,
                  },
                  {
                    name: "Warning Count",
                    value: `${userWarnings.count}`,
                    inline: true,
                  },
                  {
                    name: "Punishment Applied",
                    value:
                      isAdmin && !canManageUser ? "Message Deletion Only" : isAdmin && canManageUser ? "Permissions Removed + Mute"
                          : antiSpamData.punishment || "None",
                    inline: true,
                  },
                ],
                timestamp: new Date().toISOString(),
                footer: {
                  text: "Anti-Spam System",
                },
              };

              await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
          }
        }

        client.spamMap.set(userId, []);
      }

      if (
        !client.lastSpamCleanup ||
        currentTime - client.lastSpamCleanup > 600000
      ) {
        client.lastSpamCleanup = currentTime;

        // Clean spam map
        for (const [id, messages] of client.spamMap.entries()) {
          const validMessages = messages.filter(
            (time) => currentTime - time <= timeframe
          );
          if (validMessages.length === 0) {
            client.spamMap.delete(id);
          } else {
            client.spamMap.set(id, validMessages);
          }
        }
          
        for (const [id, warnings] of client.spamWarnings.entries()) {
          if (currentTime - warnings.lastWarning > 3600000) {
            client.spamWarnings.delete(id);
          }
        }
      }
    } catch (error) {
      client.logger.log("AntiSpam/Event", error);
    }
  },
};
