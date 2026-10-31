module.exports = {
  name: "servericon",
  category: "Information",
  cooldown: 3,
  aliases: ["sicon", "svricon"],
  description: "to show server icon",
  args: false,
  usage: "",
  userPerms: [],
  execute: async (message, args, client, prefix) => {
    if (message.guild.iconURL()) {
      const embed = new client.embed().img(
        message.guild.iconURL({ dynamic: true, size: 2048 })
      );

      message.reply({ embeds: [embed] });
    } else if (message.guild.iconURL() === null) {
      message.reply("there is null server icon");
    }
  },
};
