const { EmbedBuilder } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "kill",
  category: "Fun",
  aliases: ["kill"],
  cooldown: 3,
  description: "Kill someone",
  args: true,
  usage: "<user>",

  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({
        embeds: [new client.embed().d(`Please mention a user to kill.`)],
      });
    }
    if (user.id === message.author.id) {
      return message.reply({
        embeds: [new client.embed().d(`You can't kill yourself.`)],
      });
    }
    const response = await axios.get("https://api.waifu.pics/sfw/kill");
    const image = response.data.url;
    const embed = new client.embed()
      .setColor(client.color)
      .setDescription(`${message.author} Killed ${user}`)
      .setImage(image)
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
