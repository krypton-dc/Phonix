const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const antilink = require("@data/antilink");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;
    const antiLinkConfig = await antilink.findOne({
      guildId: message.guild.id,
    });
    if (!antiLinkConfig || !antiLinkConfig.isEnabled) return;
    if (
      antiLinkConfig.whitelistUsers.includes(message.author.id) ||
      message.member.roles.cache.some((role) =>
        antiLinkConfig.whitelistRoles.includes(role.id)
      ) ||
      antiLinkConfig.whitelistChannels.includes(message.channel.id)
    ) {
      return;
    }
    const botMember = message.guild.members.me;
    if (!botMember) return;

    const memberHasHigherRole =
      message.member.roles.highest.comparePositionTo(botMember.roles.highest) >=
      0;
    const memberIsAdmin = message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    );

    if (memberHasHigherRole || memberIsAdmin) {
      return;
    }

    if (
      !botMember.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      console.warn(`Bot lacks necessary permissions in ${message.guild.name}.`);
      return;
    }
    // instead of regex
const blockedLinks = [
  "discord.gg/",
  "discordapp.com",
  "discord.com",
  "https://"
];

const foundLink = blockedLinks.some(link =>
  message.content.toLowerCase().includes(link)
);
    if (foundLink) {
      try {
        await message.delete();
        await handleAntiLinkAction(client, message, antiLinkConfig);
      } catch (error) {
        console.error("Error applying anti-link action:", error);
        message.channel
          .send({
            content: `❌ I failed to remove the link due to a permissions error. Please check my role and permissions.`,
          })
          .catch(() => {});
      }
    }
  },
};

async function handleAntiLinkAction(client, message, antiLinkConfig) {
  if (antiLinkConfig.action === "warn") {
    const notification = await message.channel.send({
      content: `⚠️ <@${message.author.id}>, your message was deleted for containing a prohibited link.`,
    });
    setTimeout(() => notification.delete().catch(() => {}), 5000);
  }
  const userStrikeData = antiLinkConfig.strikes.find(
    (s) => s.userId === message.author.id
  );

  if (userStrikeData) {
    userStrikeData.strikes += 1;
    userStrikeData.lastStrike = new Date();
  } else {
    antiLinkConfig.strikes.push({
      userId: message.author.id,
      strikes: 1,
      lastStrike: new Date(),
    });
  }

  if (
    antiLinkConfig.punishment !== "none" &&
    userStrikeData?.strikes >= antiLinkConfig.maxStrikes
  ) {
    await applyPunishment(message.member, antiLinkConfig);
    userStrikeData.strikes = 0;
  }

  await antiLinkConfig.save();
  if (antiLinkConfig.logChannel) {
    await logAntiLinkEvent(client, message, antiLinkConfig);
  }
}

async function applyPunishment(member, antiLinkConfig) {
  const punishment = antiLinkConfig.punishment;
  if (!member) return;

  if (punishment === "timeout") {
    const muteDuration = 5 * 60 * 1000;
    await member.timeout(muteDuration, "Posted a prohibited link.");
  } else if (punishment === "kick") {
    await member.kick("Posted a prohibited link.");
  } else if (punishment === "ban") {
    await member.ban({
      reason: "Posted a prohibited link.",
    });
  }
}

async function logAntiLinkEvent(client, message, antiLinkConfig) {
  const logChannel = message.guild.channels.cache.get(
    antiLinkConfig.logChannel
  );
  if (!logChannel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle("🔗 Anti-Link System Log")
    .setDescription("A message was deleted for containing a prohibited link.")
    .addFields(
      {
        name: "User",
        value: `<@${message.author.id}> (\`${message.author.id}\`)`,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${message.channel.id}>`,
        inline: true,
      },
      {
        name: "Content",
        value: `\`\`\`\n${message.content}\n\`\`\``,
        inline: false,
      },
      {
        name: "Action Taken",
        value: `Message deleted. User has ${
          antiLinkConfig.strikes.find((s) => s.userId === message.author.id)
            ?.strikes || 1
        }/${antiLinkConfig.maxStrikes} strikes.`,
        inline: false,
      }
    )
    .setColor("#FF0000")
    .setTimestamp();

  logChannel
    .send({
      embeds: [logEmbed],
    })
    .catch(() => {});
}
