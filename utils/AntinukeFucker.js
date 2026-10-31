/** @format
 *
 * Phonix By Ozuma xd
 * © 2022 Phonix HQ
 *
 */

const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("@data/antinuke");
const recentActions = new Map();

function isRateLimited(guildId, executorId, ms = 5000) {
  const key = `${guildId}:${executorId}`;
  const last = recentActions.get(key) || 0;
  if (Date.now() - last < ms) return true;
  recentActions.set(key, Date.now());
  return false;
}

async function sendLogEmbed(
  guild,
  antiSettings,
  action,
  executor,
  details = {},
  client
) {
  try {
    if (!antiSettings.logChannelId) return;

    const logChannel = guild.channels.cache.get(antiSettings.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle("Antinuke Action Triggered")
      .setColor(client ? client.color : `#2f3136`)
      .setTimestamp()
      .addFields(
        { name: "Action", value: action, inline: true },
        {
          name: "User",
          value: `${executor.tag} (${executor.id})`,
          inline: true,
        },
        { name: "Status", value: "Banned & Reverted", inline: true }
      )
      .setThumbnail(executor.displayAvatarURL())
      .setFooter({ text: "Antinuke System", iconURL: guild.iconURL() });

    if (details.channelsDeleted) {
      embed.addFields({
        name: "Channels Deleted",
        value: `${details.channelsDeleted}`,
        inline: true,
      });
    }
    if (details.channelsRestored) {
      embed.addFields({
        name: "Channels Restored",
        value: `${details.channelsRestored}`,
        inline: true,
      });
    }
    if (details.rolesDeleted) {
      embed.addFields({
        name: "Roles Deleted",
        value: `${details.rolesDeleted}`,
        inline: true,
      });
    }
    if (details.emojisDeleted) {
      embed.addFields({
        name: "Emojis Deleted",
        value: `${details.emojisDeleted}`,
        inline: true,
      });
    }
    if (details.stickersDeleted) {
      embed.addFields({
        name: "Stickers Deleted",
        value: `${details.stickersDeleted}`,
        inline: true,
      });
    }
    if (details.stickersRestored) {
      embed.addFields({
        name: "Stickers Restored",
        value: `${details.stickersRestored}`,
        inline: true,
      });
    }

    await logChannel.send({ embeds: [embed] }).catch(() => null);
  } catch (error) {
    console.error("[ANTINUKE] Error sending log embed:", error);
  }
}

async function handleAntinukeAction(
  client,
  guild,
  auditType,
  actionName,
  payload,
  oldData = null
) {
  try {
    const antiSettings = await AntiNuke.findOne({ guildId: guild.id });
    if (!antiSettings || !antiSettings.isEnabled) return;

    const logs = await guild
      .fetchAuditLogs({ limit: 1, type: auditType })
      .catch(() => null);
    const entry = logs?.entries?.first();
    if (!entry) return;

    const difference = Date.now() - entry.createdTimestamp;
    if (difference > 3600000) return;

    const executor = entry.executor;
    if (!executor || executor.id === client.user.id) return;
    if (executor.id === guild.ownerId) return;
    if (antiSettings.extraOwners?.includes(executor.id)) return;
    if (antiSettings.whitelistUsers?.includes(executor.id)) return;
    if (isRateLimited(guild.id, executor.id)) return;

    const member = await guild.members.fetch(executor.id).catch(() => null);
    if (!member) return;

    if (
      member.roles.cache.some((r) =>
        antiSettings.whitelistRoles?.includes(r.id)
      )
    )
      return;

    await member.ban({ reason: `Antinuke: ${actionName}` }).catch(() => null);

    const logDetails = {};

    switch (actionName) {
      /** ---------------- CREATES ---------------- */
      case "channelCreate":
        {
          const auditLogs = await guild
            .fetchAuditLogs({ limit: 50, type: auditType })
            .catch(() => null);
          if (auditLogs) {
            const recentEntries = auditLogs.entries.filter(
              (e) =>
                e.executor?.id === executor.id &&
                Date.now() - e.createdTimestamp < 300000
            );

            if (recentEntries.size > 0) {
              const deletePromises = recentEntries.map(async (e) => {
                try {
                  const channel = guild.channels.cache.get(e.target?.id);
                  if (channel) {
                    await channel.delete(
                      "Antinuke: Mass channel creation detected"
                    );
                    return { success: true };
                  }
                  return { success: false };
                } catch {
                  return { success: false };
                }
              });

              const results = await Promise.allSettled(deletePromises);
              logDetails.channelsDeleted = results.filter(
                (r) => r.status === "fulfilled" && r.value.success
              ).length;
            }
          }

          if (payload?.delete)
            await payload
              .delete("Antinuke: Channel creation")
              .catch(() => null);
        }
        break;

      case "roleCreate":
        {
          const auditLogs = await guild
            .fetchAuditLogs({ limit: 50, type: auditType })
            .catch(() => null);
          if (auditLogs) {
            const recentEntries = auditLogs.entries.filter(
              (e) =>
                e.executor?.id === executor.id &&
                Date.now() - e.createdTimestamp < 300000
            );

            if (recentEntries.size > 0) {
              const results = await Promise.allSettled(
                recentEntries.map(async (e) => {
                  const role = guild.roles.cache.get(e.target?.id);
                  if (role && role.id !== guild.id) {
                    await role.delete("Antinuke: Mass role creation detected");
                    return { success: true };
                  }
                  return { success: false };
                })
              );
              logDetails.rolesDeleted = results.filter(
                (r) => r.status === "fulfilled" && r.value.success
              ).length;
            }
          }

          if (payload?.delete)
            await payload.delete("Antinuke: Role creation").catch(() => null);
        }
        break;

      case "emojiCreate":
        {
          const auditLogs = await guild
            .fetchAuditLogs({ limit: 50, type: auditType })
            .catch(() => null);
          if (auditLogs) {
            const recentEntries = auditLogs.entries.filter(
              (e) =>
                e.executor?.id === executor.id &&
                Date.now() - e.createdTimestamp < 300000
            );

            if (recentEntries.size > 0) {
              const results = await Promise.allSettled(
                recentEntries.map(async (e) => {
                  const emoji = guild.emojis.cache.get(e.target?.id);
                  if (emoji) {
                    await emoji.delete(
                      "Antinuke: Mass emoji creation detected"
                    );
                    return { success: true };
                  }
                  return { success: false };
                })
              );
              logDetails.emojisDeleted = results.filter(
                (r) => r.status === "fulfilled" && r.value.success
              ).length;
            }
          }

          if (payload?.delete)
            await payload.delete("Antinuke: Emoji creation").catch(() => null);
        }
        break;

      case "stickerCreate":
        {
          const auditLogs = await guild
            .fetchAuditLogs({ limit: 50, type: auditType })
            .catch(() => null);
          if (auditLogs) {
            const recentEntries = auditLogs.entries.filter(
              (e) =>
                e.executor?.id === executor.id &&
                Date.now() - e.createdTimestamp < 300000
            );

            if (recentEntries.size > 0) {
              const results = await Promise.allSettled(
                recentEntries.map(async (e) => {
                  const sticker = guild.stickers.cache.get(e.target?.id);
                  if (sticker) {
                    await sticker.delete(
                      "Antinuke: Mass sticker creation detected"
                    );
                    return { success: true };
                  }
                  return { success: false };
                })
              );
              logDetails.stickersDeleted = results.filter(
                (r) => r.status === "fulfilled" && r.value.success
              ).length;
            }
          }

          if (payload?.delete)
            await payload
              .delete("Antinuke: Sticker creation")
              .catch(() => null);
        }
        break;

      case "webhookCreate":
        if (payload?.delete)
          await payload.delete("Antinuke: Webhook creation").catch(() => null);
        break;

      /** ---------------- DELETES ---------------- */
      case "channelDelete":
        if (oldData) {
          try {
            await guild.channels.create({
              name: oldData?.name || "restored-channel",
              type: oldData?.type || 0,
              topic: oldData?.topic || null,
              parent: oldData?.parentId || null,
              position: oldData?.rawPosition || null,
              nsfw: oldData?.nsfw || false,
              rateLimitPerUser: oldData?.rateLimitPerUser || 0,
              permissionOverwrites: oldData?.permissionOverwrites || [],
              reason: "Antinuke: Restoring deleted channel",
            });
            logDetails.channelsRestored =
              (logDetails.channelsRestored || 0) + 1;
          } catch (err) {
            console.error("[ANTINUKE] Error restoring channel:", err);
          }
        }
        break;

      case "roleDelete":
        if (oldData) {
          await guild.roles
            .create({
              name: oldData?.name || "restored-role",
              color: oldData?.color || null,
              hoist: oldData?.hoist || false,
              permissions: oldData?.permissions || [],
              mentionable: oldData?.mentionable || false,
            })
            .catch(() => null);
        }
        break;

      case "emojiDelete":
        if (oldData) {
          await guild.emojis
            .create({
              name: oldData.name,
              attachment: oldData.url,
            })
            .catch(() => null);
        }
        break;

      case "stickerDelete":
        if (oldData) {
          await guild.stickers
            .create({
              name: oldData.name,
              description: oldData.description,
              tags: oldData.tags,
              file: oldData.url,
            })
            .catch(() => null);
          logDetails.stickersRestored = (logDetails.stickersRestored || 0) + 1;
        }
        break;

      case "webhookDelete":
        if (oldData) {
          const channel = guild.channels.cache.get(oldData.channelId);
          if (channel) {
            await channel
              .createWebhook({
                name: oldData.name,
                avatar: oldData.avatarURL,
              })
              .catch(() => null);
          }
        }
        break;

      /** ---------------- UPDATES ---------------- */
      case "channelUpdate":
        if (oldData && payload?.edit) {
          await payload
            .edit({
              name: oldData.name,
              topic: oldData.topic,
              parent: oldData.parentId,
              nsfw: oldData.nsfw,
              rateLimitPerUser: oldData.rateLimitPerUser,
            })
            .catch(() => null);
        }
        break;

      case "roleUpdate":
        if (oldData && payload?.edit) {
          await payload
            .edit({
              name: oldData.name,
              color: oldData.color,
              hoist: oldData.hoist,
              permissions: oldData.permissions,
              mentionable: oldData.mentionable,
            })
            .catch(() => null);
        }
        break;

      case "emojiUpdate":
        if (oldData && payload?.edit) {
          await payload.edit({ name: oldData.name }).catch(() => null);
        }
        break;

      case "stickerUpdate":
        if (oldData && payload?.edit) {
          await payload
            .edit({
              name: oldData.name,
              description: oldData.description,
              tags: oldData.tags,
            })
            .catch(() => null);
        }
        break;
    }

    await sendLogEmbed(
      guild,
      antiSettings,
      actionName,
      executor,
      logDetails,
      client
    );
  } catch (err) {
    console.error("[ANTINUKE] Handler error:", err);
  }
}

module.exports = { handleAntinukeAction };
