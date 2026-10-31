module.exports = {
  name: "dog",
  category: "Fun",
  aliases: ["kutta"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const res = await fetch("https://dog.ceo/api/breeds/image/random");
    const img = (await res.json()).message;
    const embed = new client.embed()
      .setTitle(`Dog`)
      .setImage(img)
      .setFooter({
        text: "Requested by " + message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setColor("#2b2d31");
    message.channel.send({ embeds: [embed] });
  },
};
