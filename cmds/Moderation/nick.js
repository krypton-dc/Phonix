const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "nick",
  aliases: ["nickname", "setnick"],
  description: "Change or reset nickname of a user",
  category: "Moderation",
  usage: "<user|id|none> [nickname]",
  userPerms: ["ManageNicknames"],
  botPerms: ["ManageNicknames"],

  execute: async (message, args, client, prefix) => {
    if (!message.guild) {
      return message.channel.send({
        embeds: [
          new client.embed().d("❌ This command can only be used in a server."),
        ],
      });
    }

    const author = message.member;
    const me = message.guild.members.me;
    const tick =
      client && client.emoji && client.emoji.tick ? client.emoji.tick : "✅";
    const possibleMember =
      message.mentions.members.first() ||
      (args[0]
        ? message.guild.members.cache.get(args[0].replace(/[<@!>]/g, ""))
        : null);
    const target = possibleMember || message.member;
    const newNick = possibleMember
      ? args.slice(1).join(" ").trim()
      : args.join(" ").trim();
    if (
      target.id !== author.id &&
      !author.permissions.has(PermissionsBitField.Flags.ManageNicknames) &&
      author.id !== message.guild.ownerId
    ) {
      return message.channel.send({
        embeds: [
          new client.embed().d(
            "❌ You need **Manage Nicknames** permission to change other members' nicknames."
          ),
        ],
      });
    }

    if (!me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return message.channel.send({
        embeds: [
          new client.embed().d(
            "❌ I need the **Manage Nicknames** permission to do this."
          ),
        ],
      });
    }
    if (!target.manageable) {
      return message.channel.send({
        embeds: [
          new client.embed().d(
            "❌ I cannot change this member's nickname (role hierarchy or missing permission)."
          ),
        ],
      });
    }

    try {
      if (!newNick) {
        await target.setNickname(null, `Reset by ${message.author.tag}`);
        return message.channel.send({
          embeds: [
            new client.embed().d(
              `${tick} Reset **${target.user.tag}**'s nickname to default.`
            ),
          ],
        });
      }
      if (newNick.length > 32) {
        return message.channel.send({
          embeds: [
            new client.embed().d("❌ Nickname must be 32 characters or less."),
          ],
        });
      }

      await target.setNickname(newNick, `Changed by ${message.author.tag}`);
      return message.channel.send({
        embeds: [
          new client.embed().d(
            `${tick} Changed **${target.user.tag}**'s nickname to **${newNick}**`
          ),
        ],
      });
    } catch (err) {
      client.logger.log(err, "error");
      return message.channel.send({
        embeds: [
          new client.embed().d(
            "Something went wrong. Make sure I have the right permissions and my role is higher than the target."
          ),
        ],
      });
    }
  },
};
