const Giveaway = require("@data/giveaway");

module.exports = {
  name: "greroll",
  category: "Giveaway",
  description: "Pick new winners from a past giveaway",
  usage: "<messageID>",
    args: true,
  userPerms: ["ManageGuild"],

  execute: async (message, args, client) => {
    const giveaway = await Giveaway.findOne({
      messageId: args[0],
      ended: true,
    });
    if (!giveaway) {
      return message.channel.send({
        embeds: [
          new client.embed().setDescription(
            "No ended giveaway found with that message ID."
          ),
        ],
      });
    }

    if (!giveaway.winners || giveaway.winners.length === 0) {
      return message.channel.send({
        embeds: [
          new client.embed().setDescription("No participants to reroll."),
        ],
      });
    }

    const winners = pickWinners(giveaway.winners, giveaway.winnerCount);
    message.channel.send({
      embeds: [
        new client.embed()
          .t("🎉 Reroll Winners!")
          .setDescription(
            `New winners for **${giveaway.prize}**: ${winners
              .map((w) => `<@${w}>`)
              .join(", ")}`
          ),
      ],
    });
  },
};

function pickWinners(participants, count) {
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
