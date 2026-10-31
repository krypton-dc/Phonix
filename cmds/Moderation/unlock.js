const { ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "unlock",
  category: "Moderation",
  aliases: ["unlockchannel", "unlockall", "unlockchannels"],
  cooldown: 3,
  description: "Unlock a specific channel or all channels.",
  usage: "`unlock [channel/all]`",
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],

  execute: async (message, args, client) => {
    const input = args[0]?.toLowerCase();
    if (input === "all") {
      const confirmRow = new ActionRowBuilder().addComponents(
        new client.button().s("confirm_unlockall", "", client.emoji.tick),
        new client.button().s("cancel_unlockall", "", client.emoji.cross)
      );

      const confirmEmbed = new client.embed().d(
        `${client.emoji.warn} | Are you sure you want to unlock **all channels** for @everyone?`
      );

      const msg = await message.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
      });

      const collector = msg.createMessageComponentCollector({
        time: 15000,
        max: 1,
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== message.author.id)
          return i.reply({
            content: "Only the command author can confirm this action.",
            ephemeral: true,
          });

        if (i.customId === "cancel_unlockall") {
          return i.update({
            embeds: [
              new client.embed().d(
                `${client.emoji.cross} | Unlock All cancelled.`
              ),
            ],
            components: [],
          });
        }

        let count = 0;
        message.guild.channels.cache.forEach((ch) => {
          ch.permissionOverwrites
            .edit(message.guild.roles.everyone, {
              SendMessages: true,
            })
            .catch(() => {});
          count++;
        });

        i.update({
          embeds: [
            new client.embed().d(
              `${client.emoji.tick} | Unlocked **${count}** channels.`
            ),
          ],
          components: [],
        });
      });

      collector.on("end", (collected) => {
        if (!collected.size) {
          msg.edit({
            embeds: [
              new client.embed().d(
                `${client.emoji.cross} | Timed out. No action taken.`
              ),
            ],
            components: [],
          });
        }
      });

      return;
    }

    const targetChannel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]) ||
      message.channel;

    if (!targetChannel.manageable)
      return message.reply({
        content: `I don't have permission to manage ${targetChannel}.`,
        allowedMentions: { repliedUser: false },
      });

    await targetChannel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: true,
        reason: `${message.author.tag} (${message.author.id})`,
      }
    );

    return message.reply({
      embeds: [
        new client.embed().d(
          `${client.emoji.tick} | ${targetChannel} has been unlocked for @everyone.`
        ),
      ],
    });
  },
};
