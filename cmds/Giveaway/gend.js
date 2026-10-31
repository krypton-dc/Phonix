const Giveaway = require("@data/giveaway");

module.exports = {
  name: "gend",
  category: "Giveaway",
  description: "End a giveaway early",
  args: true,
  usage: "<messageID>",
  userPerms: ["ManageGuild"],

  execute: async (message, args, client) => {
    const giveaway = await Giveaway.findOne({
      messageId: args[0],
      ended: false,
    });
    if (!giveaway) {
      return message.channel.send({
        embeds: [
          new client.embed().setDescription(
            "No active giveaway found with that message ID."
          ),
        ],
      });
    }
    giveaway.endAt = new Date();
    await giveaway.save();
    message.channel.send({
      embeds: [
        new client.embed().setDescription("⏹ Giveaway will end shortly."),
      ],
    });
  },
};
