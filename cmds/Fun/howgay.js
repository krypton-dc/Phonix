module.exports = {
  name: "howgay",
  aliases: ["gay"],
  description: "Shows how gay you are",
  usage: "gay <Mention Member>",
  category: "Fun",
  cooldown: 5,
  args: true,
  botPerms: ["SendMessages", "EmbedLinks"],
  execute: async (message, args, client, prefix) => {
    const User = message.mentions.members.first();
    const gayrate = Math.floor(Math.random() * 101);
    const gaydalle = new client.embed()
      .setColor(client.color)
      .setDescription(`**${User} is ${gayrate}% Gay! ${client.emoji.new}**`);
    message.channel.send({ embeds: [gaydalle] });
  },
};
