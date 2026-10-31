const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "stickerCreate",
    run: async (c, sticker) =>
      await handleAntinukeAction(
        c,
        sticker.guild,
        AuditLogEvent.StickerCreate,
        "stickerCreate",
        sticker
      ),
  },
  {
    name: "stickerUpdate",
    run: async (c, oldSticker, newSticker) =>
      await handleAntinukeAction(
        c,
        newSticker.guild,
        AuditLogEvent.StickerUpdate,
        "stickerUpdate",
        newSticker,
        {
          name: oldSticker.name,
          description: oldSticker.description,
          tags: oldSticker.tags,
          url: oldSticker.url,
        }
      ),
  },
  {
    name: "stickerDelete",
    run: async (c, sticker) =>
      await handleAntinukeAction(
        c,
        sticker.guild,
        AuditLogEvent.StickerDelete,
        "stickerDelete",
        sticker,
        {
          name: sticker.name,
          description: sticker.description,
          tags: sticker.tags,
          url: sticker.url,
        }
      ),
  },
];
