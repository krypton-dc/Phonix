const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const {
  sendLog,
  getAuditLogExecutor,
  createDiffField,
  formatTimestamp,
  formatRelativeTime,
  truncate,
  formatPermissionsDiff,
  formatRolesDiff,
  getLogColor,
} = require("@utils/Logs");

module.exports = [
  // Message Delete
  {
    name: "messageDelete",
    run: async (client, message) => {
      if (!message.guild || message.author?.bot) return;

      const embed = new EmbedBuilder()
        .setColor(getLogColor("delete"))
        .setAuthor({
          name: `Message Deleted`,
          iconURL: message.author?.displayAvatarURL(),
        })
        .setDescription(
          `**Author:** ${message.author || "Unknown User"}\n` +
          `**Channel:** ${message.channel}\n` +
          `**Message ID:** \`${message.id}\``
        )
        .addFields({
          name: "Content",
          value: truncate(message.content || "*[No text content]*"),
          inline: false,
        })
        .setTimestamp();

      if (message.attachments.size > 0) {
        embed.addFields({
          name: "Attachments",
          value: message.attachments.map((a) => `[${a.name}](${a.url})`).join("\n"),
          inline: false,
        });
      }

      await sendLog(client, message.guild, "messageLogs", embed);
    },
  },

  // Message Update
  {
    name: "messageUpdate",
    run: async (client, oldMessage, newMessage) => {
      if (!oldMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const embed = new EmbedBuilder()
        .setColor(getLogColor("update"))
        .setAuthor({
          name: `Message Edited`,
          iconURL: newMessage.author?.displayAvatarURL(),
        })
        .setDescription(
          `**Author:** ${newMessage.author}\n` +
          `**Channel:** ${newMessage.channel}\n` +
          `**Message:** [Jump to Message](${newMessage.url})`
        )
        .addFields(
          {
            name: "Before",
            value: truncate(oldMessage.content || "*[No content]*"),
            inline: false,
          },
          {
            name: "After",
            value: truncate(newMessage.content || "*[No content]*"),
            inline: false,
          }
        )
        .setTimestamp();

      await sendLog(client, newMessage.guild, "messageLogs", embed);
    },
  },

  // Member Join
  {
    name: "guildMemberAdd",
    run: async (client, member) => {
      const accountAge = Date.now() - member.user.createdTimestamp;
      const daysOld = Math.floor(accountAge / (1000 * 60 * 60 * 24));

      const embed = new EmbedBuilder()
        .setColor(getLogColor("join"))
        .setAuthor({
          name: `Member Joined`,
          iconURL: member.user.displayAvatarURL(),
        })
        .setDescription(`${member.user} ${member.user.tag}`)
        .addFields(
          { name: "Account Created", value: formatRelativeTime(member.user.createdAt), inline: true },
          { name: "Account Age", value: `${daysOld} days old`, inline: true },
          { name: "Member Count", value: `${member.guild.memberCount}`, inline: true },
          { name: "User ID", value: `\`${member.id}\``, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp();

      await sendLog(client, member.guild, "memberJoinLeave", embed);
    },
  },

  // Member Leave
  {
    name: "guildMemberRemove",
    run: async (client, member) => {
      const roles = member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .map((r) => r.toString())
        .join(", ") || "None";

      const embed = new EmbedBuilder()
        .setColor(getLogColor("leave"))
        .setAuthor({
          name: `Member Left`,
          iconURL: member.user.displayAvatarURL(),
        })
        .setDescription(`${member.user} ${member.user.tag}`)
        .addFields(
          { name: "Joined Server", value: formatRelativeTime(member.joinedAt), inline: true },
          { name: "Member Count", value: `${member.guild.memberCount}`, inline: true },
          { name: "Roles", value: truncate(roles, 1024), inline: false },
          { name: "User ID", value: `\`${member.id}\``, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp();

      await sendLog(client, member.guild, "memberJoinLeave", embed);
    },
  },

  // Channel Create
  {
    name: "channelCreate",
    run: async (client, channel) => {
      if (!channel.guild) return;

      const executor = await getAuditLogExecutor(
        channel.guild,
        AuditLogEvent.ChannelCreate,
        channel.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("create"))
        .setAuthor({ name: `Channel Created` })
        .setDescription(`**Channel:** ${channel}\n**Type:** ${channel.type}`)
        .addFields(
          { name: "Name", value: channel.name, inline: true },
          { name: "ID", value: `\`${channel.id}\``, inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Created By", value: `${executor.tag}`, inline: true });
      }

      if (channel.topic) {
        embed.addFields({ name: "Topic", value: truncate(channel.topic, 1024), inline: false });
      }

      await sendLog(client, channel.guild, "channelChanges", embed);
    },
  },

  // Channel Delete
  {
    name: "channelDelete",
    run: async (client, channel) => {
      if (!channel.guild) return;

      const executor = await getAuditLogExecutor(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("delete"))
        .setAuthor({ name: `Channel Deleted` })
        .setDescription(`**Name:** ${channel.name}\n**Type:** ${channel.type}`)
        .addFields({ name: "ID", value: `\`${channel.id}\``, inline: true })
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Deleted By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, channel.guild, "channelChanges", embed);
    },
  },

  // Role Create
  {
    name: "roleCreate",
    run: async (client, role) => {
      const executor = await getAuditLogExecutor(
        role.guild,
        AuditLogEvent.RoleCreate,
        role.id
      );

      const embed = new EmbedBuilder()
        .setColor(role.color || getLogColor("create"))
        .setAuthor({ name: `Role Created` })
        .setDescription(`**Role:** ${role}\n**Name:** ${role.name}`)
        .addFields(
          { name: "Color", value: role.hexColor, inline: true },
          { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
          { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
          { name: "ID", value: `\`${role.id}\``, inline: false }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Created By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, role.guild, "roleChanges", embed);
    },
  },

  // Role Delete
  {
    name: "roleDelete",
    run: async (client, role) => {
      const executor = await getAuditLogExecutor(
        role.guild,
        AuditLogEvent.RoleDelete,
        role.id
      );

      const embed = new EmbedBuilder()
        .setColor(role.color || getLogColor("delete"))
        .setAuthor({ name: `Role Deleted` })
        .setDescription(`**Name:** ${role.name}`)
        .addFields(
          { name: "Color", value: role.hexColor, inline: true },
          { name: "ID", value: `\`${role.id}\``, inline: true }
        )
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Deleted By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, role.guild, "roleChanges", embed);
    },
  },

  // Voice State Update
  {
    name: "voiceStateUpdate",
    run: async (client, oldState, newState) => {
      const member = newState.member;
      let action = "";
      let color = getLogColor("info");

      // Joined voice channel
      if (!oldState.channelId && newState.channelId) {
        action = "Joined Voice Channel";
        color = getLogColor("join");
      }
      // Left voice channel
      else if (oldState.channelId && !newState.channelId) {
        action = "Left Voice Channel";
        color = getLogColor("leave");
      }
      // Moved channels
      else if (oldState.channelId !== newState.channelId) {
        action = "Moved Voice Channels";
        color = getLogColor("update");
      }
      // Mute/Unmute/Deafen changes
      else if (
        oldState.serverMute !== newState.serverMute ||
        oldState.serverDeaf !== newState.serverDeaf ||
        oldState.selfMute !== newState.selfMute ||
        oldState.selfDeaf !== newState.selfDeaf
      ) {
        action = "Voice State Changed";
        color = getLogColor("update");
      } else {
        return; // No relevant change
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
          name: action,
          iconURL: member.user.displayAvatarURL(),
        })
        .setDescription(`**Member:** ${member}\n**User:** ${member.user.tag}`)
        .setTimestamp();

      // Add channel information
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        embed.addFields(
          { name: "From", value: `<#${oldState.channelId}>`, inline: true },
          { name: "To", value: `<#${newState.channelId}>`, inline: true }
        );
      } else if (newState.channelId) {
        embed.addFields({ name: "Channel", value: `<#${newState.channelId}>`, inline: true });
      } else if (oldState.channelId) {
        embed.addFields({ name: "Channel", value: `<#${oldState.channelId}>`, inline: true });
      }

      // Add state changes
      const stateChanges = [];
      if (oldState.serverMute !== newState.serverMute) {
        stateChanges.push(`Server Mute: ${oldState.serverMute ? "Yes" : "No"} → ${newState.serverMute ? "Yes" : "No"}`);
      }
      if (oldState.serverDeaf !== newState.serverDeaf) {
        stateChanges.push(`Server Deafen: ${oldState.serverDeaf ? "Yes" : "No"} → ${newState.serverDeaf ? "Yes" : "No"}`);
      }
      if (oldState.selfMute !== newState.selfMute) {
        stateChanges.push(`Self Mute: ${oldState.selfMute ? "Yes" : "No"} → ${newState.selfMute ? "Yes" : "No"}`);
      }
      if (oldState.selfDeaf !== newState.selfDeaf) {
        stateChanges.push(`Self Deafen: ${oldState.selfDeaf ? "Yes" : "No"} → ${newState.selfDeaf ? "Yes" : "No"}`);
      }

      if (stateChanges.length > 0) {
        embed.addFields({ name: "Changes", value: stateChanges.join("\n"), inline: false });
      }

      await sendLog(client, newState.guild, "voiceState", embed);
    },
  },

  // Emoji Create
  {
    name: "emojiCreate",
    run: async (client, emoji) => {
      const executor = await getAuditLogExecutor(
        emoji.guild,
        AuditLogEvent.EmojiCreate,
        emoji.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("create"))
        .setAuthor({ name: `Emoji Created` })
        .setDescription(`**Emoji:** ${emoji}\n**Name:** \`:${emoji.name}:\``)
        .addFields(
          { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true },
          { name: "ID", value: `\`${emoji.id}\``, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Created By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, emoji.guild, "emojiChanges", embed);
    },
  },

  // Emoji Delete
  {
    name: "emojiDelete",
    run: async (client, emoji) => {
      const executor = await getAuditLogExecutor(
        emoji.guild,
        AuditLogEvent.EmojiDelete,
        emoji.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("delete"))
        .setAuthor({ name: `Emoji Deleted` })
        .setDescription(`**Name:** \`:${emoji.name}:\``)
        .addFields(
          { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true },
          { name: "ID", value: `\`${emoji.id}\``, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Deleted By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, emoji.guild, "emojiChanges", embed);
    },
  },

  // Emoji Update
  {
    name: "emojiUpdate",
    run: async (client, oldEmoji, newEmoji) => {
      if (oldEmoji.name === newEmoji.name) return;

      const executor = await getAuditLogExecutor(
        newEmoji.guild,
        AuditLogEvent.EmojiUpdate,
        newEmoji.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("update"))
        .setAuthor({ name: `Emoji Updated` })
        .setDescription(`**Emoji:** ${newEmoji}`)
        .addFields(
          { name: "Old Name", value: `:${oldEmoji.name}:`, inline: true },
          { name: "New Name", value: `:${newEmoji.name}:`, inline: true },
          { name: "ID", value: `\`${newEmoji.id}\``, inline: true }
        )
        .setThumbnail(newEmoji.url)
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Updated By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, newEmoji.guild, "emojiChanges", embed);
    },
  },

  // Guild Ban Add
  {
    name: "guildBanAdd",
    run: async (client, ban) => {
      const executor = await getAuditLogExecutor(
        ban.guild,
        AuditLogEvent.MemberBanAdd,
        ban.user.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("ban"))
        .setAuthor({
          name: `Member Banned`,
          iconURL: ban.user.displayAvatarURL(),
        })
        .setDescription(`**User:** ${ban.user}\n**Tag:** ${ban.user.tag}`)
        .addFields({ name: "User ID", value: `\`${ban.user.id}\``, inline: true })
        .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      if (ban.reason) {
        embed.addFields({ name: "Reason", value: truncate(ban.reason), inline: false });
      }

      if (executor) {
        embed.addFields({ name: "Banned By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, ban.guild, "moderationActions", embed);
    },
  },

  // Guild Ban Remove
  {
    name: "guildBanRemove",
    run: async (client, ban) => {
      const executor = await getAuditLogExecutor(
        ban.guild,
        AuditLogEvent.MemberBanRemove,
        ban.user.id
      );

      const embed = new EmbedBuilder()
        .setColor(getLogColor("unban"))
        .setAuthor({
          name: `Member Unbanned`,
          iconURL: ban.user.displayAvatarURL(),
        })
        .setDescription(`**User:** ${ban.user}\n**Tag:** ${ban.user.tag}`)
        .addFields({ name: "User ID", value: `\`${ban.user.id}\``, inline: true })
        .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
        .setTimestamp();

      if (executor) {
        embed.addFields({ name: "Unbanned By", value: `${executor.tag}`, inline: true });
      }

      await sendLog(client, ban.guild, "moderationActions", embed);
    },
  },

  // Guild Member Update
  {
    name: "guildMemberUpdate",
    run: async (client, oldMember, newMember) => {
      const changes = [];

      // Nickname change
      if (oldMember.nickname !== newMember.nickname) {
        changes.push(
          createDiffField(
            "Nickname",
            oldMember.nickname || oldMember.user.username,
            newMember.nickname || newMember.user.username,
            false
          )
        );
      }

      // Role changes
      const roleFields = formatRolesDiff(oldMember.roles, newMember.roles);
      changes.push(...roleFields);

      // Avatar change
      if (oldMember.avatar !== newMember.avatar) {
        changes.push({
          name: "Server Avatar",
          value: "Changed",
          inline: true,
        });
      }

      // Timeout changes
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
        if (newMember.communicationDisabledUntil) {
          changes.push({
            name: "⏰ Timeout",
            value: `Until ${formatTimestamp(newMember.communicationDisabledUntil)}`,
            inline: false,
          });
        } else {
          changes.push({
            name: "⏰ Timeout",
            value: "Removed",
            inline: false,
          });
        }
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setColor(getLogColor("update"))
        .setAuthor({
          name: `Member Updated`,
          iconURL: newMember.user.displayAvatarURL(),
        })
        .setDescription(`**Member:** ${newMember}\n**User:** ${newMember.user.tag}`)
        .addFields(changes.filter(Boolean))
        .setTimestamp();

      await sendLog(client, newMember.guild, "memberUpdate", embed);
    },
  },

  // Guild Update
  {
    name: "guildUpdate",
    run: async (client, oldGuild, newGuild) => {
      const changes = [];

      // Name change
      if (oldGuild.name !== newGuild.name) {
        changes.push(createDiffField("Name", oldGuild.name, newGuild.name, false));
      }

      // Icon change
      if (oldGuild.icon !== newGuild.icon) {
        changes.push({ name: "Icon", value: "Changed", inline: true });
      }

      // Banner change
      if (oldGuild.banner !== newGuild.banner) {
        changes.push({ name: "Banner", value: "Changed", inline: true });
      }

      // Verification level
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push(
          createDiffField(
            "Verification Level",
            oldGuild.verificationLevel,
            newGuild.verificationLevel,
            true
          )
        );
      }

      // AFK channel
      if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
        changes.push(
          createDiffField(
            "AFK Channel",
            oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : "None",
            newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : "None",
            true
          )
        );
      }

      // System channel
      if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
        changes.push(
          createDiffField(
            "System Channel",
            oldGuild.systemChannelId ? `<#${oldGuild.systemChannelId}>` : "None",
            newGuild.systemChannelId ? `<#${newGuild.systemChannelId}>` : "None",
            true
          )
        );
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setColor(getLogColor("update"))
        .setAuthor({ name: `Server Updated`, iconURL: newGuild.iconURL() })
        .setDescription(`**Server:** ${newGuild.name}`)
        .addFields(changes.filter(Boolean))
        .setTimestamp();

      await sendLog(client, newGuild, "guildUpdate", embed);
    },
  },
];