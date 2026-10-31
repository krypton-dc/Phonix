const { MessageFlags } = require("discord.js");
const { NSFW } = require("nsfwhub");

module.exports = {
  name: "pussy",
  description: "Sends a random nsfw4k video",
  aliases: ["choot", "chut"],
  cooldown: 5,
  usage: "pussy",
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
        const nsfw = new NSFW();
        
nsfw.fetch("pussy").then((data) => {
message.channel.send(data.image.url);
    })
    }
  }
}