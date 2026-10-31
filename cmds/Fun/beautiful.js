const { EmbedBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const canvafy = require("canvafy");

module.exports = {
  name: "beautiful",
  description: "Create a 'beautiful' meme image for the mentioned user.",
  usage: "beautiful <user>",
  cooldown: 3,
  category: "Fun",
  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first() || message.author;
    const avatar = user.displayAvatarURL({
      dynamic: false,
      format: "png",
      size: 512,
    });

    try {
      const image = await canvafy.Image.beautiful(avatar);
      const attachment = new AttachmentBuilder(image, {
        name: "beautiful.png",
      });
      const embed = new client.embed()
        .setTitle(`${user.username} looks... beautiful!`)
        .setColor(client.color)
        .setImage("attachment://beautiful.png");

      return message.channel.send({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error(error);
      return message.reply("An error occurred while generating the image.");
    }
  },
};
