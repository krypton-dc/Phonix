const { MessageFlags } = require("discord.js");
const nsfw4kLinks = require("@custom/nsfw4k.json");

module.exports = {
  name: "nsfw4k",
  description: "Sends a random nsfw4k video",
  aliases: [
    "nsfw4k",
    "nsfwvideo",
    "nsfwvid",
    "nsfwvids",
    "nsfwvidz",
    "nsfwvids",
    "nsfwvidz",
  ],
  cooldown: 5,
  usage: "nsfw4k",
  category: "Adult",
  execute: async (message, args, client) => {
    if (!message.channel.nsfw) {
      const x = client
        .box()
        .text(`This Is A Adult Cmd So Kindly Enable Age Restriction`);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [x],
      });
    } else {
      const randomLink =
        nsfw4kLinks[Math.floor(Math.random() * nsfw4kLinks.length)];
      await message.reply({ content: randomLink });
    }
  },
};
