const {
  UserSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const { TicketSetup, TicketData } = require("@data/ticket");

module.exports = {
  name: "interactionCreate",

  run: async (client, interaction) => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === "ticket_dropdown") {
        const selected = interaction.values[0];
        if (selected !== "create_ticket") return;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const setup = await TicketSetup.findOne({
          guildId: interaction.guild.id,
          channelId: interaction.channel.id,
        });

        if (!setup)
          return interaction.editReply({
            content: "No ticket setup found for this panel.",
          });

        const existing = await TicketData.findOne({
          guildId: interaction.guild.id,
          ownerId: interaction.user.id,
          closed: false,
        });

        if (existing)
          return interaction.editReply({
            content: "You already have an open ticket.",
          });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_ticket")
            .setLabel("Create Ticket")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("cancel_ticket")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        );

        const msg = client
          .box()
          .text(`**Ticket Confirmation**
> Are you sure you want to create a ticket, ${interaction.user}?`)
          .sep()
          .addActionRowComponents(confirmRow);

        return interaction.editReply({
          components: [msg],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      // 🎛 Button Interactions
      if (interaction.isButton()) {
        const { customId } = interaction;
        if (customId === "confirm_ticket") {
          await interaction.deferUpdate();

          const existing = await TicketData.findOne({
            guildId: interaction.guild.id,
            ownerId: interaction.user.id,
            closed: false,
          });

          if (existing)
            return interaction.followUp({
              content: "You already have an open ticket.",
              flags: MessageFlags.Ephemeral,
            });

          const setup = await TicketSetup.findOne({
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
          });

          const overwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ];

          if (setup.supportRoles?.length) {
            setup.supportRoles.forEach((role) =>
              overwrites.push({
                id: role,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              })
            );
          }

          const admins = interaction.guild.members.cache.filter((m) =>
            m.permissions.has(PermissionFlagsBits.Administrator)
          );
          for (const admin of admins.values()) {
            overwrites.push({
              id: admin.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            });
          }

          const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username.replace(/[^a-zA-Z0-9]/g, "").substring(0, 90)}`,
            type: ChannelType.GuildText,
            parent: setup.categoryId || null,
            permissionOverwrites: overwrites,
          });

          await TicketData.create({
            guildId: interaction.guild.id,
            channelId: channel.id,
            ownerId: interaction.user.id,
            closed: false,
          });

          const control = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket_confirm")
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("add_user")
              .setLabel("Add User")
              .setStyle(ButtonStyle.Secondary)
          );

          const ticketMsg = client
            .box()
            .text(`**Ticket Created**
> Welcome ${interaction.user}, please describe your issue below.
> A staff member will assist you shortly.
> Team: ${setup.supportRoles?.length ? setup.supportRoles.map(r => `<@&${r}>`).join(' ') : "No support roles set."}`)
            .sep()
            .addActionRowComponents(control);

          await channel.send({ components: [ticketMsg], flags: MessageFlags.IsComponentsV2 });

          const createdMsg = client
            .box()
            .text(`**Ticket Created!**
> Your ticket has been opened in ${channel}.`)
            .sep();

          return interaction.followUp({
            components: [createdMsg],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (customId === "cancel_ticket") {
          await interaction.deferUpdate();
          const canceled = client.box().text("**Ticket creation canceled.**").sep();
          return interaction.followUp({
            components: [canceled],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        // ➕ Add User
        if (customId === "add_user") {
          await interaction.deferUpdate();

          const userSelect = new UserSelectMenuBuilder()
            .setCustomId("add_user_select")
            .setPlaceholder("Select a user to add")
            .setMinValues(1)
            .setMaxValues(1);

          const row = new ActionRowBuilder().addComponents(userSelect);

          return interaction.followUp({
            content: "Select a user to add to this ticket:",
            components: [row],
            flags: MessageFlags.Ephemeral,
          });
        }
          
        if (customId === "close_ticket_confirm") {
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket")
              .setLabel("Confirm Close")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("cancel_close")
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Secondary)
          );

          const confirmBox = client
            .box()
            .text("**Are you sure you want to close this ticket?**")
            .sep()
            .addActionRowComponents(confirmRow);

          return interaction.reply({
            components: [confirmBox],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        if (customId === "close_ticket") {
          await TicketData.updateOne({ channelId: interaction.channel.id }, { closed: true });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("reopen_ticket")
              .setLabel("Reopen")
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId("delete_ticket")
              .setLabel("Delete")
              .setStyle(ButtonStyle.Secondary)
          );

          const closedMsg = client.box().text("**This ticket has been closed.**").sep().addActionRowComponents(row);

          return interaction.reply({ components: [closedMsg], flags: MessageFlags.IsComponentsV2 });
        }

        if (customId === "reopen_ticket") {
          await TicketData.updateOne({ channelId: interaction.channel.id }, { closed: false });

          const reopenRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket_confirm")
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Secondary)
          );

          const reopenMsg = client.box().text(`${client.emoji.tick} **This ticket has been reopened.**`).sep().addActionRowComponents(reopenRow);

          return interaction.reply({ components: [reopenMsg], flags: MessageFlags.IsComponentsV2 });
        }

        if (customId === "delete_ticket") {
          await interaction.reply({
            content: `${client.emoji.delete} | Deleting ticket...`,
            flags: MessageFlags.Ephemeral,
          });
          return interaction.channel.delete().catch(() => {});
        }

        if (customId === "cancel_close") {
          await interaction.deferUpdate();
          const cancelClose = client.box().text(`${client.emoji.cross} **Ticket close canceled.**`).sep();
          return interaction.followUp({
            components: [cancelClose],
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // 👤 Handle Add User Select
      if (interaction.isUserSelectMenu() && interaction.customId === "add_user_select") {
        const userId = interaction.values[0];
        const member = await interaction.guild.members.fetch(userId);
        await interaction.deferUpdate();

        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        await interaction.followUp({
          content: `${client.emoji.tick} ${member} has been added to the ticket!`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      console.error("🎟 Ticket Error:", err);
      if (!interaction.replied && !interaction.deferred) {
        const errorBox = client.box().text("**Something went wrong while handling this interaction.**").sep();
        await interaction.reply({ components: [errorBox], flags: MessageFlags.Ephemeral });
      }
    }
  },
};
