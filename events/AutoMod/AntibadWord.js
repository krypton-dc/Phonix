const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const AntiBadword = require("@data/antibadword");

// A default list of words to filter if the server has not configured its own.
const DEFAULT_BADWORDS = [
  // English Profanity & Slurs
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "slut",
  "dick",
  "dickhead",
  "pussy",
  "cunt",
  "bastard",
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "whore",
  "prostitute",
  "porn",
  "sex",
  "hentai",
  "douchebag",
  "wanker",
  "jizz",
  "cum",
  "bollocks",
  "twat",
  "goddamn",
  "hell",
  "damn",
  "cock",
  "cocksucker",

  // Racial & Ethnic Slurs
  "beaner",
  "chink",
  "gook",
  "spic",
  "wetback",
  "kyke",
  "tranny",
  "shemale",

  // Misogynistic Terms
  "bimbo",
  "skank",

  // Hindi Slangs (Expanded)
  "chutiya",
  "madarchod",
  "bhenchod",
  "bhen ke lode",
  "gandu",
  "randi",
  "lodu",
  "lund",
  "gaand",
  "bhosdike",
  "choot",
  "jhaat",
  "harami",
  "kutta",
  "kamina",
  "suar",
  "madarjaat",
  "lavde",
  "bc",
  "mkc",
  "bur",
  "jhat",
  "chutiya",
  "maakichut",
  "gaandu",
  "bh0sda",

  // Variations & Leetspeak (Examples)
  "fck",
  "fuk",
  "s3x",
  "p0rn",
  "a55hole",
  "b!tch",
];

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    const antiBadwordConfig = await AntiBadword.findOne({
      guildId: message.guild.id,
    });

    if (!antiBadwordConfig || !antiBadwordConfig.isEnabled) return;
    if (
      antiBadwordConfig.whitelistUsers.includes(message.author.id) ||
      message.member.roles.cache.some((role) =>
        antiBadwordConfig.whitelistRoles.includes(role.id)
      ) ||
      antiBadwordConfig.whitelistChannels.includes(message.channel.id)
    ) {
      return;
    }

    const botMember = message.guild.members.me;
    if (!botMember) return;
    const memberIsImmune =
      message.member.roles.highest.comparePositionTo(botMember.roles.highest) >=
        0 ||
      message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (memberIsImmune) {
      return;
    }

    if (
      !botMember.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)
    ) {
      console.warn(
        `Anti-Badword: Bot lacks necessary permissions in ${message.guild.name}.`
      );
      return;
    }

    const wordsToFilter =
      antiBadwordConfig.badWords.length > 0
        ? antiBadwordConfig.badWords
        : DEFAULT_BADWORDS;
    const messageContent = message.content.toLowerCase();
    const foundBadWord = wordsToFilter.find((word) =>
      new RegExp(
        `\\b${word.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`,
        "i"
      ).test(messageContent)
    );

    if (foundBadWord) {
      try {
        await message.delete();
        await handleBadwordAction(
          client,
          message,
          antiBadwordConfig,
          foundBadWord
        );
      } catch (error) {
        console.error("Error applying anti-badword action:", error);
      }
    }
  },
};

async function handleBadwordAction(client, message, config, foundWord) {
  let userStrikeData = config.strikes.find(
    (s) => s.userId === message.author.id
  );

  const newStrikeCount = (userStrikeData?.strikes || 0) + 1;
  let punishmentApplied = false;

  if (userStrikeData) {
    userStrikeData.strikes = newStrikeCount;
    userStrikeData.lastStrike = new Date();
  } else {
    userStrikeData = {
      userId: message.author.id,
      strikes: 1,
      lastStrike: new Date(),
    };
    config.strikes.push(userStrikeData);
  }

  // --- Actions & Punishments ---
  if (config.action.includes("warn")) {
    const notification = await message.channel.send({
      content: `> ${client.emoji.warn} <@${message.author.id}>, your message was deleted for containing a prohibited word.`,
    });
    setTimeout(() => notification.delete().catch(() => {}), 5000);
  }

  // Check if punishment is warranted
  if (config.punishment !== "none" && newStrikeCount >= config.maxStrikes) {
    await applyPunishment(message.member, config);
    userStrikeData.strikes = 0; // Reset strikes after punishment
    punishmentApplied = true;
  }

  // --- Database & Logging ---
  if (config.logChannel && config.action.includes("log")) {
    // Log before saving to capture the state that caused the action
    await logBadwordEvent(
      client,
      message,
      config,
      foundWord,
      newStrikeCount,
      punishmentApplied
    );
  }

  // **THE FIX**: Explicitly tell Mongoose that the strikes array has been modified.
  config.markModified("strikes");
  await config.save();
}

async function applyPunishment(member, config) {
  if (!member || !member.manageable) return;

  const reason = "Exceeded max strikes for bad word usage.";
  try {
    switch (config.punishment) {
      case "timeout":
        await member.timeout(5 * 60 * 1000, reason); // 5 minutes
        break;
      case "kick":
        await member.kick(reason);
        break;
      case "ban":
        await member.ban({ reason });
        break;
    }
  } catch (error) {
    console.error(
      `Failed to apply punishment "${config.punishment}" to ${member.user.tag}:`,
      error
    );
  }
}

async function logBadwordEvent(
  client,
  message,
  config,
  foundWord,
  strikeCount,
  punishmentApplied
) {
  const logChannel = message.guild.channels.cache.get(config.logChannel);
  if (!logChannel) return;

  let actionTakenDescription;
  if (punishmentApplied) {
    actionTakenDescription = `User reached strike **${strikeCount} / ${config.maxStrikes}**. Punishment (**${config.punishment}**) applied. Strikes reset.`;
  } else {
    actionTakenDescription = `Message deleted. User now has **${strikeCount} / ${config.maxStrikes}** strikes.`;
  }

  const logEmbed = new EmbedBuilder()
    .setTitle("🚫 Anti-Badword System Log")
    .setDescription("A message was deleted for containing a prohibited word.")
    .setColor("#FFA500")
    .setTimestamp()
    .addFields(
      {
        name: "User",
        value: `<@${message.author.id}> (\`${message.author.id}\`)`,
        inline: true,
      },
      { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
      { name: "Detected Word", value: `\`${foundWord}\``, inline: true },
      {
        name: "Content",
        value: `\`\`\`\n${message.content}\n\`\`\``,
        inline: false,
      },
      { name: "Action Taken", value: actionTakenDescription, inline: false }
    );

  logChannel.send({ embeds: [logEmbed] }).catch(() => {});
}
