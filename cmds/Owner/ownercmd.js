module.exports = {
  name: "ownercmd",
  category: "Owner",
  aliases: ["ownercmd", "ocmdlist", "ocmd"],
  description: "Help with all commands, or one specific command.",
  args: false,
  owner: true,
  usage: "",
  botPrams: ["EmbedLinks", "SEND_MESSAGES"],
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const Owns = client.commands
      .filter((x) => x.category && x.category === "Owner")
      .map((x) => `\`${x.name}\``);
    return await message.channel.send({
      embeds: [new client.embed().d(Owns.join(", "))],
    });
  },
};
