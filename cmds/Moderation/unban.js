const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "unban",
  category: "Moderation",
  aliases: ["Unban"],
  cooldown: 3,
  description: "Unban a user by ID or unban all banned users.",
  usage: "`unban <userID>` or `unban all`",
  userPerms: ["BanMembers"],
  botPerms: ["BanMembers"],

  execute: async (message, args, client, prefix) => {
    const input = args[0];

    if (!input || input.toLowerCase() === "all") {
      const bans = await message.guild.bans.fetch();
      if (!bans.size)
        return message.channel.send(`${client.emoji.cross} | No banned users.`);

      const row = new ActionRowBuilder().addComponents(
        new client.button().s("confirm_unbanall", "", client.emoji.tick),
        new client.button().s("cancel_unbanall", "", client.emoji.cross),
      );

      const msg = await message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.warn} | Confirm unbanning **${bans.size}** users?`,
          ),
        ],
        components: [row],
      });

      const collector = msg.createMessageComponentCollector({
        time: 15000,
        max: 1,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id)
          return i.reply({
            content: "Only the command author can confirm.",
            ephemeral: true,
          });

        if (i.customId === "cancel_unbanall") {
          return i.update({
            embeds: [
              new client.embed().d(`${client.emoji.cross} | Cancelled.`),
            ],
            components: [],
          });
        }

        let count = 0;
        for (const [, ban] of bans) {
          await message.guild.members.unban(ban.user.id).catch(() => {});
          count++;
        }

        i.update({
          embeds: [
            new client.embed().d(
              `${client.emoji.tick} | Unbanned **${count}** users.`,
            ),
          ],
          components: [],
        });
      });

      collector.on("end", (collected) => {
        if (!collected.size)
          msg.edit({
            embeds: [
              new client.embed().d(`${client.emoji.cross} | Timed out.`),
            ],
            components: [],
          });
      });

      return;
    }

    try {
      const bans = await message.guild.bans.fetch();
      const bannedUser = bans.get(input);

      if (!bannedUser)
        return message.channel.send(
          `${client.emoji.cross} | User not found in ban list.`,
        );

      await message.guild.members.unban(input);
      message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.tick} | Unbanned **${bannedUser.user.tag}**.`,
          ),
        ],
      });
    } catch (err) {
      console.error(err);
      message.channel.send(`${client.emoji.cross} | Error: \`${err.message}\``);
    }
  },
};
