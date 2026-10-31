const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const Profile = require("@data/profile");

// Configuration
const CONFIG = {
  COLORS: {
    PRIMARY: "#5865F2",
    SUCCESS: "#57F287",
    WARNING: "#FEE75C",
    ERROR: "#ED4245",
    INFO: "#5865F2",
    ACCENT: "#EB459E"
  },
  LIMITS: {
    BIO: 500,
    USERNAME: 32,
    TITLE: 50,
    QUOTE: 150
  },
  SOCIALS: {
    twitter: { name: "Twitter", emoji: "🐦", color: "#1DA1F2", placeholder: "https://twitter.com/username" },
    instagram: { name: "Instagram", emoji: "📸", color: "#E4405F", placeholder: "https://instagram.com/username" },
    youtube: { name: "YouTube", emoji: "🎥", color: "#FF0000", placeholder: "https://youtube.com/@username" },
    twitch: { name: "Twitch", emoji: "🎮", color: "#9146FF", placeholder: "https://twitch.tv/username" },
    github: { name: "GitHub", emoji: "💻", color: "#171515", placeholder: "https://github.com/username" },
    linkedin: { name: "LinkedIn", emoji: "💼", color: "#0077B5", placeholder: "https://linkedin.com/in/username" },
    discord: { name: "Discord", emoji: "💬", color: "#5865F2", placeholder: "username#0000" },
    website: { name: "Website", emoji: "🌐", color: "#00D4AA", placeholder: "https://yourwebsite.com" },
    spotify: { name: "Spotify", emoji: "🎵", color: "#1DB954", placeholder: "https://open.spotify.com/user/username" },
    reddit: { name: "Reddit", emoji: "🤖", color: "#FF4500", placeholder: "https://reddit.com/u/username" }
  }
};

// Utility functions
const utils = {
  isValidUrl: (string) => {
    try {
      new URL(string);
      return true;
    } catch { return false; }
  },
  
  truncate: (text, length) => text?.length > length ? text.slice(0, length - 3) + "..." : text,
  
  formatNumber: (num) => num?.toLocaleString() || "0",
  
  getRandomColor: () => Object.values(CONFIG.COLORS)[Math.floor(Math.random() * Object.values(CONFIG.COLORS).length)],
  
  createProgressBar: (current, max, length = 10) => {
    const filled = Math.round((current / max) * length);
    const empty = length - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }
};

module.exports = {
  name: "profile",
  aliases: ["bio", "bioset", "me", "card"],
  category: "Social",
  cooldown: 3,
  description: "🌟 Create and customize your stunning profile!",
  usage: "profile [view|edit|reset] [@user]",
  botPerms: ["EmbedLinks", "UseExternalEmojis"],
  
  execute: async (message, args, client) => {
    const { author, guild } = message;
    const subcommand = args[0]?.toLowerCase();
    const targetUser = message.mentions.users.first() || author;

    try {
      switch (subcommand) {
        case "view": case "show":
          return await viewProfile(message, targetUser, client);
        case "reset": case "clear":
          return await resetProfile(message, client);
        default:
          return await editProfile(message, client);
      }
    } catch (error) {
      console.error("[PROFILE ERROR]:", error);
      return message.reply({
        embeds: [createErrorEmbed("Something went wrong! Please try again.")]
      });
    }
  },
};

// View Profile Function
async function viewProfile(message, targetUser, client) {
  let profile = await Profile.findOne({ User: targetUser.id });
  const isOwner = message.author.id === targetUser.id;

  if (!profile && !isOwner) {
    return message.reply({
      embeds: [new EmbedBuilder()
        .setColor(CONFIG.COLORS.INFO)
        .setTitle("📋 Empty Profile")
        .setDescription(`**${targetUser.displayName}** hasn't created their profile yet!`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))]
    });
  }

  if (!profile) {
    profile = { User: targetUser.id, Bio: "", SocialMedia: new Map(), createdAt: new Date() };
  }

  const embed = new EmbedBuilder()
    .setTitle(`✨ ${targetUser.displayName}'s Profile`)
    .setColor(profile.AccentColor || CONFIG.COLORS.PRIMARY)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();

  // Bio section
  if (profile.Bio) {
    embed.addFields({
      name: "📖 About Me",
      value: `\`\`\`${profile.Bio}\`\`\``,
      inline: false
    });
  }

  // Quote section
  if (profile.Quote) {
    embed.addFields({
      name: "💭 Quote",
      value: `*"${profile.Quote}"*`,
      inline: false
    });
  }

  // Social media links
  if (profile.SocialMedia && profile.SocialMedia.size > 0) {
    const socialsList = Array.from(profile.SocialMedia.entries())
      .map(([platform, url]) => {
        const social = CONFIG.SOCIALS[platform];
        return social ? `${social.emoji} **[${social.name}](${url})**` : null;
      })
      .filter(Boolean)
      .join("\n") || "None";

    embed.addFields({
      name: "🔗 Social Links",
      value: socialsList,
      inline: false
    });
  }

  // Profile stats
  const joinedDate = message.guild?.members.cache.get(targetUser.id)?.joinedAt;
  const statsValue = [
    `🗓️ **Joined:** ${joinedDate ? `<t:${Math.floor(joinedDate.getTime() / 1000)}:R>` : "Unknown"}`,
    `📊 **Profile Created:** <t:${Math.floor((profile.createdAt || new Date()).getTime() / 1000)}:R>`,
    `🎨 **Theme:** ${profile.Theme || "Default"}`
  ].join("\n");

  embed.addFields({
    name: "📈 Stats",
    value: statsValue,
    inline: false
  });

  const components = isOwner ? [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_edit_${targetUser.id}`)
      .setLabel("Edit Profile")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✏️")
  )] : [];

  return message.reply({ embeds: [embed], components });
}

// Edit Profile Function
async function editProfile(message, client) {
  const { author } = message;
  let profile = await Profile.findOne({ User: author.id });
  
  if (!profile) {
    profile = new Profile({ User: author.id });
    await profile.save();
  }

  const embed = new EmbedBuilder()
    .setTitle("🎨 Profile Customization Center")
    .setDescription("Transform your profile into something amazing!")
    .setColor(CONFIG.COLORS.ACCENT)
    .setThumbnail(author.displayAvatarURL({ dynamic: true }))
    .addFields([
      {
        name: "📖 Biography",
        value: profile.Bio ? 
          `${utils.truncate(profile.Bio, 100)}\n${utils.createProgressBar(profile.Bio.length, CONFIG.LIMITS.BIO)} \`${profile.Bio.length}/${CONFIG.LIMITS.BIO}\`` : 
          "✨ *Not set - Add your story!*",
        inline: true
      },
      {
        name: "💭 Quote",
        value: profile.Quote ? 
          `*"${utils.truncate(profile.Quote, 50)}"*\n\`${profile.Quote.length}/${CONFIG.LIMITS.QUOTE}\`` : 
          "💫 *Add an inspiring quote*",
        inline: true
      },
      {
        name: "🔗 Social Links",
        value: profile.SocialMedia?.size ? 
          `**${profile.SocialMedia.size}** platforms connected\n🌟 *Looking great!*` : 
          "🚀 *Connect your socials*",
        inline: true
      },
      {
        name: "🎨 Customization",
        value: `**Theme:** ${profile.Theme || "Default"}\n**Color:** ${profile.AccentColor || "Auto"}`,
        inline: true
      }
    ])
    .setFooter({ text: "Click the buttons below to customize your profile!" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_bio_${author.id}`)
      .setLabel("Edit Bio")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝"),
    new ButtonBuilder()
      .setCustomId(`profile_quote_${author.id}`)
      .setLabel("Add Quote")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("💭"),
    new ButtonBuilder()
      .setCustomId(`profile_socials_${author.id}`)
      .setLabel("Social Links")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔗")
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_theme_${author.id}`)
      .setLabel("Themes")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🎨"),
    new ButtonBuilder()
      .setCustomId(`profile_preview_${author.id}`)
      .setLabel("Preview")
      .setStyle(ButtonStyle.Success)
      .setEmoji("👀"),
    new ButtonBuilder()
      .setCustomId(`profile_reset_${author.id}`)
      .setLabel("Reset All")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️")
  );

  return message.reply({ embeds: [embed], components: [row1, row2] });
}

// Reset Profile Function
async function resetProfile(message, client) {
  const confirmEmbed = new EmbedBuilder()
    .setTitle("⚠️ Reset Profile")
    .setDescription("Are you sure you want to **permanently delete** all your profile data?\n\n*This action cannot be undone!*")
    .setColor(CONFIG.COLORS.WARNING);

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`profile_confirm_reset_${message.author.id}`)
      .setLabel("Yes, Reset Everything")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`profile_cancel_reset_${message.author.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("❌")
  );

  return message.reply({ embeds: [confirmEmbed], components: [confirmRow] });
}

// Helper Functions
function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(CONFIG.COLORS.ERROR)
    .setTitle("❌ Error")
    .setDescription(message)
    .setTimestamp();
}

function createSuccessEmbed(message) {
  return new EmbedBuilder()
    .setColor(CONFIG.COLORS.SUCCESS)
    .setTitle("Success")
    .setDescription(message)
    .setTimestamp();
}