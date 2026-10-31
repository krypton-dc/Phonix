const { MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require("discord.js");
const { TicketSetup } = require("@data/ticket");

module.exports = {
  name: "ticket",
  category: "Ticket",
  description: "Manage the ticket system",
  usage: "ticket <setup/list/reset>",
  userPerms: ["Administrator"], 
  execute: async (message, args, client) => {
    const sub = args[0]?.toLowerCase();
    const filter = m => m.author.id === message.author.id;

    if (!sub) {
      const x = client.box()
        .text(`${client.emoji.ticket} Ticket`).sep()
        .text(
          "Enhance your server with the Ticket System feature!\n\n" +
          "**Ticket Setup**\nTo Setup Ticket System - `ticket setup`\n\n" +
          "**Ticket List**\nTo List All Ticket Setups - `ticket list`\n\n" +
          "**Ticket Reset**\nTo Reset All Ticket Setups - `ticket reset`"
        );

      return message.channel.send({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }

    if (sub === "setup") {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return message.reply(`${client.emoji.warn} You need Administrator permissions.`);

      const botMsg1 = await message.channel.send("Please mention the channel for the ticket panel.");
      const collected1 = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
      const userMsg1 = collected1.first();
      const panelChannel = userMsg1?.mentions.channels.first();
      if (!panelChannel) return message.reply(`${client.emoji.cross} Invalid channel.`);

      await botMsg1.delete().catch(() => {});
      await userMsg1.delete().catch(() => {});

      const botMsg2 = await message.channel.send("Please enter the category ID where tickets will be created.");
      const collected2 = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
      const userMsg2 = collected2.first();
      const categoryId = userMsg2?.content.trim();

      if (!categoryId) return message.reply(`${client.emoji.cross} Invalid category ID.`);

      await botMsg2.delete().catch(() => {});
      await userMsg2.delete().catch(() => {});

      const botMsg3 = await message.channel.send("Do you want a staff role to manage tickets? (yes/no)");
      const collected3 = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
      const userMsg3 = collected3.first();
      const needRole = userMsg3?.content.toLowerCase() === "yes";

      await botMsg3.delete().catch(() => {});
      await userMsg3.delete().catch(() => {});

      let roleMentions = [];
      if (needRole) {
        const botMsg4 = await message.channel.send("Mention the staff role(s) that should have access to tickets.");
        const collected4 = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });
        const userMsg4 = collected4.first();
        roleMentions = userMsg4?.mentions.roles.map(r => r.id) || [];

        await botMsg4.delete().catch(() => {});
        await userMsg4.delete().catch(() => {});
      }

      const panel = client.box().text("# Ticket Panel").sep()
        .text("> Select an option from the dropdown to create a ticket.");

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("ticket_dropdown")
          .setPlaceholder("Select ticket type")
          .addOptions([
            { label: "Create Ticket", description: "Open a new support ticket", value: "create_ticket" },
            { label: "General Ticket", description: "Open a general support ticket", value: "create_ticket_gen" },
          ])
      );
      panel.addActionRowComponents(row);

      const panelMsg = await panelChannel.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });

      await TicketSetup.create({
        guildId: message.guild.id,
        channelId: panelChannel.id,
        messageId: panelMsg.id,
        categoryId,
        supportRoles: roleMentions,
      });

      return message.channel.send(`${client.emoji.tick} Ticket system has been set up successfully.`);
    }

    if (sub === "list") {
      const setups = await TicketSetup.find({ guildId: message.guild.id });
      if (!setups.length) return message.reply("No ticket setups found.");
      return message.channel.send("```" + setups.map(s => `Channel: ${s.channelId} | Message: ${s.messageId} | Staff Roles: ${s.supportRoles?.join(", ") || "None"}`).join("\n") + "```");
    }

    if (sub === "reset") {
      await TicketSetup.deleteMany({ guildId: message.guild.id });
      return message.channel.send(`${client.emoji.tick} All ticket setups reset.`);
    }
  }
};
