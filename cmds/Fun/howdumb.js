module.exports = {
  name: "howdumb",
  aliases: ["dumb"],
  description: "Shows how dumb you are",
  usage: "dumb <Mention Member>",
  category: "Fun",
  cooldown: 5,
  args: true,
  botPerms: ["SendMessages", "EmbedLinks"],

  execute: async (message, args, client, prefix) => {
    const User = message.mentions.members.first();
    const gayrate = Math.floor(Math.random() * 101);

    const Dumbdalle = new client.embed()
      .setColor(client.color)
      .setDescription(`**${User} is ${gayrate}% Dumb! ${client.emoji.new}**`);
    message.channel.send({ embeds: [Dumbdalle] });
  },
};
