module.exports = {
  name: "kick",
  category: "Moderation",
  aliases: ["kick"],
  cooldown: 3,
  description: "to kick any user",
  args: true,
  usage: "",
  userPerms: ["KickMembers"],
  botPerms: ["KickMembers"],

  execute: async (message, args, client, prefix) => {
      const member = await client.util.user(args[0]);
      const user = await message?.guild.members.cache.get(member);
    let reason = args.slice(1).join(" ") || "No Reason Provided";
    reason = `${message.author.tag} (${message.author.id}) | ` + reason;

    if (!user) {
      return message.reply({
        embeds: [
          new client.embed().d(`${client.emoji.cross} | User Not Found`),
        ],
      });
    }

    if (user.id === client.user.id) {
      return message.reply({
        embeds: [
          new client.embed().d(`${client.emoji.cross} | You can't kick me.`),
        ],
      });
    }

    if (user.id === message.guild.ownerId) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | I can't kick the owner of this server.`
          ),
        ],
      });
    }

    if (
      user.roles.highest.position >= message.member.roles.highest.position &&
      message.author.id !== message.guild.ownerId
    ) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | You can't kick a user with a higher or equal role.`
          ),
        ],
      });
    }

    if (!user.kickable) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | I can't kick this user.`
          ),
        ],
      });
    }

    await user.kick({ reason });
    return message.channel.send({
      embeds: [
        new client.embed()
          .setColor(client.color)
          .setDescription(
            `${client.emoji.tick} | Successfully kicked **${user.user.tag}** from the server.`
          ),
      ],
    });
  },
};
