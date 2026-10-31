module.exports = {
  twitter: {
    emoji: "🐦",
    regex: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/,
    placeholders: {
      link: "https://twitter.com/username",
      username: "Your Twitter handle",
    },
  },
  instagram: {
    emoji: "📷",
    regex: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
    placeholders: {
      link: "https://instagram.com/username",
      username: "Your Instagram handle",
    },
  },
  discord: {
    emoji: "💬",
    regex: /^https?:\/\/(www\.)?(discord\.gg\/|discord\.com\/invite\/)[a-zA-Z0-9]+$/,
    placeholders: {
      link: "https://discord.gg/invite-code",
      username: "Server/User name",
    },
  },
  youtube: {
    emoji: "📺",
    regex: /^https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)|youtu\.be\/)[a-zA-Z0-9_-]+\/?$/,
    placeholders: {
      link: "https://youtube.com/@username",
      username: "Channel name",
    },
  },
  twitch: {
    emoji: "🎮",
    regex: /^https?:\/\/(www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/?$/,
    placeholders: {
      link: "https://twitch.tv/username",
      username: "Your Twitch handle",
    },
  },
  github: {
    emoji: "💻",
    regex: /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/,
    placeholders: {
      link: "https://github.com/username",
      username: "Your GitHub username",
    },
  },
};
