const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "emojiCreate",
    run: async (c, emoji) =>
      await handleAntinukeAction(
        c,
        emoji.guild,
        AuditLogEvent.EmojiCreate,
        "emojiCreate",
        emoji
      ),
  },
  {
    name: "emojiUpdate",
    run: async (c, oldEmoji, newEmoji) =>
      await handleAntinukeAction(
        c,
        newEmoji.guild,
        AuditLogEvent.EmojiUpdate,
        "emojiUpdate",
        newEmoji,
        {
          name: oldEmoji.name,
          url: oldEmoji.url,
        }
      ),
  },
  {
    name: "emojiDelete",
    run: async (c, emoji) =>
      await handleAntinukeAction(
        c,
        emoji.guild,
        AuditLogEvent.EmojiDelete,
        "emojiDelete",
        emoji,
        {
          name: emoji.name,
          url: emoji.url,
        }
      ),
  },
];
