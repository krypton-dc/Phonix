module.exports = {
  name: "simp",
  aliases: ["simprate"],
  description: "Shows how simp you are",
  usage: "simp <Mention Member>",
  category: "Fun",
  cooldown: 5,
  args: true,
  botPerms: ["SendMessages", "EmbedLinks"],
  execute: async (message, args, client, prefix) => {
    const User = message.mentions.members.first();

    const Result = Math.floor(Math.random() * 101);
    const embed = new client.embed().d(
      `**${User} Is ${Result}% Simp ${client.emoji.new}**`
    );

    message.channel.send({ embeds: [embed] });
  },
};
