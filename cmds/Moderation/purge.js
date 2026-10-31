const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "purge",
  category: "Moderation",
  aliases: ["clear", "clean"],
  cooldown: 3,
  description: "Delete messages with various filters.",
  args: true,
  usage: "<amount> [all|bot|embed|emoji|file|image|link|mention|reaction]",
  userPerms: ["ManageMessages"],
  botPerms: ["ManageMessages"],

  execute: async (message, args, client) => {
    message.delete().catch(() => null);
    setTimeout(() => {
      message.delete().catch(() => null);
    }, 3000);

    const amount = parseInt(args[0]);
    let filterInput = args[1]?.toLowerCase() || "all";

    if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
      return message.channel.send({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | Provide a valid number between 1 and 100.`,
          ),
        ],
      }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
    }

    const filterMap = {
      a: "all",
      b: "bot",
      e: "embed",
      em: "emoji",
      f: "file",
      i: "image",
      l: "link",
      m: "mention",
      r: "reaction",
    };

    if (filterMap[filterInput]) {
      filterInput = filterMap[filterInput];
    }

    const validFilters = [
      "all",
      "bot",
      "embed",
      "emoji",
      "file",
      "image",
      "link",
      "mention",
      "reaction",
    ];

    if (!validFilters.includes(filterInput)) {
      return message.channel.send({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | Invalid filter. Valid: ${validFilters.join(", ")} or their short forms.`,
          ),
        ],
      }).then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
    }

    const result = await client.util.purgeMessages(
      message.member,
      message.channel,
      filterInput.toUpperCase(),
      amount,
      null,
      message,
    );

    let replyEmbed;

    switch (result) {
      case "MemberPerm":
        replyEmbed = `${client.emoji.cross} | You lack permission to delete messages here.`;
        break;
      case "BotPerms":
        replyEmbed = `${client.emoji.cross} | I lack permission to delete messages here.`;
        break;
      case "NO_MESSAGES":
        replyEmbed = `${client.emoji.cross} | No messages found with filter **${filterInput}**.`;
        break;
      case "ERROR":
        replyEmbed = `${client.emoji.cross} | Something went wrong while purging.`;
        break;
      default:
        replyEmbed = `${client.emoji.tick} | Deleted **${result}** messages with filter **${filterInput}**.`;
        break;
    }

    // Send the reply and delete it after 3 seconds
    message.channel.send({ embeds: [new client.embed().d(replyEmbed)] })
      .then(msg => setTimeout(() => msg.delete().catch(() => null), 3000));
  },
};
