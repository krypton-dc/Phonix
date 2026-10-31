const { ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "unhide",
  category: "Moderation",
  aliases: ["unhidechannel"],
  cooldown: 3,
  description: "Unhide a specific channel or all channels.",
  usage: "`unhide [channel/all]`",
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],

  execute: async (message, args, client) => {
    const input = args[0]?.toLowerCase();
    if (input === "all") {
      const confirmRow = new ActionRowBuilder().addComponents(
        new client.button().s("confirm_unhideall", "", client.emoji.tick),
        new client.button().s("cancel_unhideall", "", client.emoji.cross),
      );

      const confirmEmbed = new client.embed()
        .setColor(client.color)
        .setDescription(
          `${client.emoji.warn} | Are you sure you want to unhide **all hidden channels** for @everyone?`,
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

        if (i.customId === "cancel_unhideall") {
          return i.update({
            embeds: [
              new client.embed().d(
                `${client.emoji.cross} | Unhide All cancelled.`,
              ),
            ],
            components: [],
          });
        }

        let count = 0;
        message.guild.channels.cache.forEach((ch) => {
          if (
            ch.viewable &&
            ch
              .permissionsFor(message.guild.roles.everyone)
              ?.has("ViewChannel") === false
          ) {
            ch.permissionOverwrites
              .edit(message.guild.roles.everyone, {
                ViewChannel: true,
              })
              .catch(() => {});
            count++;
          }
        });

        i.update({
          embeds: [
            new client.embed().d(
              `${client.emoji.tick} | Unhid **${count}** channels for @everyone.`,
            ),
          ],
          components: [],
        });
      });

      collector.on("end", (collected) => {
        if (!collected.size)
          msg.edit({
            embeds: [
              new client.embed().d(
                `${client.emoji.cross} | Timed out, no response received.`,
              ),
            ],
            components: [],
          });
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
        ViewChannel: true,
      },
    );

    return message.reply({
      embeds: [
        new client.embed()
          .setColor(client.color)
          .setDescription(
            `${client.emoji.tick} | ${targetChannel} has been unhidden for @everyone.`,
          ),
      ],
    });
  },
};
