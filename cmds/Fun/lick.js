const { EmbedBuilder } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "lick",
  description: "Lick someone",
  category: "Fun",
  cooldown: 3,
  botPerms: ["SendMessages", "EmbedLinks"],
  userPerms: ["SendMessages", "EmbedLinks"],
  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply({
        embeds: [new client.embed().d(`Please mention a user to lick.`)],
      });
    }
    if (user.id === message.author.id) {
      return message.reply({
        embeds: [new client.embed().d(`You can't lick yourself.`)],
      });
    }
    const response = await axios.get("https://api.waifu.pics/sfw/lick");
    const image = response.data.url;
    const embed = new client.embed()
      .setColor(client.color)
      .setDescription(`${message.author} Licks ${user}`)
      .setImage(image)
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  },
};
