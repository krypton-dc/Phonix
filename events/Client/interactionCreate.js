const {
  InteractionType,
  PermissionsBitField,
  PermissionFlagsBits,
  ContainerBuilder,
  UserSelectMenuBuilder,
  TextDisplayBuilder,
  MessageFlags,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("@data/prefix");
const db3 = require("@data/setup");
const VoiceConfig = require("@data/voiceConfig");

module.exports = {
  name: "interactionCreate",
  run: async (client, interaction) => {
    let prefix = client.prefix;
    try {
      const ress = await db.findOne({ Guild: interaction.guildId });
      if (ress && ress.Prefix) prefix = ress.Prefix;
    } catch {}
      
    if (!client.vcData) client.vcData = new Map();
    if (interaction.isButton() && interaction.customId.startsWith("waiting_")) {
      const [_, action, userId, waitingChannelId] = interaction.customId.split("_");
      if (!/^\d{17,20}$/.test(userId)) {
        await interaction.reply({ content: "Invalid user ID.", flags: MessageFlags.Ephemeral });
        return;
      }
      const guild = interaction.guild;
      const member = await guild.members.fetch(userId).catch(() => null);
      const waitingChannel = guild.channels.cache.get(waitingChannelId);
      if (!client.waitingRooms || !client.waitingRooms.has(waitingChannelId)) {
        await interaction.reply({ content: "No waiting room found.", flags: MessageFlags.Ephemeral });
        return;
      }
      const { ownerId, ownerVcId } = client.waitingRooms.get(waitingChannelId);
      if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: "Only VC owner can accept or deny requests.", flags: MessageFlags.Ephemeral });
        return;
      }
      if (!member || !waitingChannel) {
        await interaction.reply({ content: "Waiting member or channel not found.", flags: MessageFlags.Ephemeral });
        client.waitingRooms.delete(waitingChannelId);
        return;
      }
      const ownerVC = guild.channels.cache.get(ownerVcId);
      if (action === "accept") {
        if (!ownerVC) {
          await interaction.reply({ content: "Owner VC does not exist.", flags: MessageFlags.Ephemeral });
          client.waitingRooms.delete(waitingChannelId);
          await waitingChannel.delete().catch(() => {});
          return;
        }
        await member.voice.setChannel(ownerVcId).catch(() => {});
        await waitingChannel.delete().catch(() => {});
        await new Promise((res) => setTimeout(res, 500));
        await interaction.reply({ content: `Accepted! Moved ${member} to VC.`, flags: MessageFlags.Ephemeral });
        client.waitingRooms.delete(waitingChannelId);
        return;
      } else if (action === "deny") {
        await member.voice.disconnect().catch(() => {});
        await waitingChannel.delete().catch(() => {});
        await interaction.reply({ content: `Denied! ${member} has been disconnected.`, flags: MessageFlags.Ephemeral });
        client.waitingRooms.delete(waitingChannelId);
        return;
      }
    }


if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;
      try {
        if (
          command.botPerms &&
          !interaction.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms))
        ) {
          const c = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `I don't have **${command.botPerms}** permission in ${interaction.channel.toString()} to execute ${command.name}.`
            )
          );
          await interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
          return;
        }
        if (
          command.userPerms &&
          !interaction.member.permissions.has(PermissionsBitField.resolve(command.userPerms))
        ) {
          const c = new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `You don't have **${command.userPerms}** permission in ${interaction.channel.toString()} to execute ${command.name}.`
            )
          );
          await interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
          return;
        }
        await command.run(client, interaction, prefix);
        return;
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: "An unexpected error occured." }).catch(() => {});
        } else {
          await interaction.reply({ content: "An unexpected error occured.", flags: MessageFlags.Ephemeral }).catch(() => {});
        }
        return;
      }
    }

if (interaction.isModalSubmit()) {
      try {
        const vcID = client.tempVoice?.get(interaction.user.id);
        const channel = interaction.guild ? interaction.guild.channels.cache.get(vcID) : null;
        if (!channel) {
          await interaction.reply({ content: "Channel was not found.", flags: MessageFlags.Ephemeral });
          return;
        }
        const ownerId = client.vcOwners?.get(channel.id);
        if (interaction.user.id !== ownerId) {
          await interaction.reply({ content: `Only the VC owner can use this control. VC owner: <@${ownerId || "none"}>`, flags: MessageFlags.Ephemeral });
          return;
        }
        if (interaction.customId === "vc_limit_modal") {
          const input = interaction.fields.getTextInputValue("limit_input");
          const value = parseInt(input);
          if (isNaN(value) || value < 1 || value > 99) {
            await interaction.reply({ content: "Invalid number. Please enter between 1 and 99.", flags: MessageFlags.Ephemeral });
            return;
          }
          await channel.setUserLimit(value);
          await interaction.reply({ content: `Voice channel user limit set to ${value}`, flags: MessageFlags.Ephemeral });
          return;
        }
        if (interaction.customId === "vc_kick_modal") {
          const input = interaction.fields.getTextInputValue("kick_input").trim();
          if (!/^\d{17,19}$/.test(input)) {
            await interaction.reply({ content: "Invalid input. Please enter a valid user ID.", flags: MessageFlags.Ephemeral });
            return;
          }
          let memberToKick = null;
          try {
            memberToKick = await interaction.guild.members.fetch(input);
          } catch {
            await interaction.reply({ content: "Could not find a user with that ID in this server.", flags: MessageFlags.Ephemeral });
            return;
          }
          if (!channel.members.has(memberToKick.id)) {
            await interaction.reply({ content: "That user is not in your VC.", flags: MessageFlags.Ephemeral });
            return;
          }
          try {
            await memberToKick.voice.disconnect();
            await interaction.reply({ content: `<@${memberToKick.id}> has been kicked from your VC.`, flags: MessageFlags.Ephemeral });
            return;
          } catch {
            await interaction.reply({ content: "Failed to kick the user. I might be missing permissions.", flags: MessageFlags.Ephemeral });
            return;
          }
        }
        if (interaction.customId === "vc_rename_modal") {
          const input = interaction.fields.getTextInputValue("rename_input").trim();
          const newName = `${input.slice(0, 30)}`;
          try {
            await channel.setName(newName);
            await interaction.reply({ content: `Renamed VC to ${input}`, flags: MessageFlags.Ephemeral });
            return;
          } catch {
            await interaction.reply({ content: "Failed to rename the VC.", flags: MessageFlags.Ephemeral });
            return;
          }
        }
        // Profile/bioset modal (leaving as is)
        const command = require("../../cmds/Information/bioset");
        await command.modalHandler(interaction);
        return;
      } catch (err) {
        console.error("Modal error:", err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "There was an error processing your input. Please try again.", flags: MessageFlags.Ephemeral });
        }
        return;
      }
    }


    // VC BUTTON HANDLER
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith("vc_")) return;
      const vcID = client.tempVoice?.get(interaction.user.id);
      const guild = interaction.guild;
      if (!guild) {
        await interaction.reply({ content: "Must be in a guild.", flags: MessageFlags.Ephemeral });
        return;
      }
      const channel = vcID ? guild.channels.cache.get(vcID) : null;
      if (!channel) {
        await interaction.reply({ content: "Your personal VC was not found.", flags: MessageFlags.Ephemeral });
        return;
      }
      const ownerId = client.vcOwners?.get(channel.id);
      if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: `Only the VC owner can use this. Owner: <@${ownerId || "none"}>`, flags: MessageFlags.Ephemeral });
        return;
      }

      async function requireOwner() { return true; }

      try {
        switch (interaction.customId) {
          case "vc_rename": {
            const modal = new ModalBuilder()
              .setCustomId("vc_rename_modal")
              .setTitle("Rename Your VC")
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("rename_input")
                    .setLabel("New VC name (max 30 chars)")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(30)
                    .setRequired(true)
                )
              );
            await interaction.showModal(modal);
            return;
          }
          case "vc_limit": {
            const modal = new ModalBuilder()
              .setCustomId("vc_limit_modal")
              .setTitle("Set VC Limit")
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("limit_input")
                    .setLabel("Enter a number (1-99)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            await interaction.showModal(modal);
            return;
          }
                          case "vc_claim": {
            const guildCfg = await VoiceConfig.findOne({ guildID: interaction.guild.id });
            if (!guildCfg || channel.parentId !== guildCfg.categoryID) {
              return interaction.reply({ content: "This is not a valid personal VC.", flags: MessageFlags.Ephemeral });
            }

            if (!client.vcOwners) client.vcOwners = new Map();
            const currentOwner = client.vcOwners.get(channel.id);

            if (currentOwner) {
              if (!channel.members.has(currentOwner)) {
                client.vcOwners.set(channel.id, interaction.user.id);
                try {
                  const vc = guildCfg.voiceChannels.get(channel.id);
                  if (vc) { vc.ownerID = interaction.user.id; guildCfg.voiceChannels.set(channel.id, vc); await guildCfg.save(); }
                } catch (e) { console.error("persist owner claim error:", e); }
                return interaction.reply({ content: `Previous owner is not present. You are now the owner of **${channel.name}**.`, flags: MessageFlags.Ephemeral });
              } else {
                return interaction.reply({ content: `This VC is currently owned by <@${currentOwner}>. Ask them to transfer ownership.`, flags: MessageFlags.Ephemeral });
              }
            } else {
              client.vcOwners.set(channel.id, interaction.user.id);
              try {
                const vc = guildCfg.voiceChannels.get(channel.id);
                if (vc) { vc.ownerID = interaction.user.id; guildCfg.voiceChannels.set(channel.id, vc); await guildCfg.save(); }
              } catch (e) { console.error("persist owner claim error:", e); }
              return interaction.reply({ content: `You are now the owner of **${channel.name}**.`, flags: MessageFlags.Ephemeral });
            }
          }
          case "vc_privacy": {
            const privacyMenu = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("vc_privacy_options")
                .setPlaceholder("Select a Privacy Option")
                .addOptions([
                  { label: "Lock", value: "lock", description: "Only trusted users can join", emoji: "🔒" },
                  { label: "Unlock", value: "unlock", description: "Everyone can join", emoji: "🔓" },
                  { label: "Invisible", value: "invisible", description: "Only trusted users can view", emoji: "🙈" },
                  { label: "Visible", value: "visible", description: "Everyone can view", emoji: "👁️" },
                  { label: "Close Chat", value: "close_chat", description: "Only trusted users can text", emoji: "💬" }
                ])
            );
            await interaction.reply({ content: "Select a Privacy Option", components: [privacyMenu], flags: MessageFlags.Ephemeral });
            return;
          }
          case "vc_kick": {
            const options = channel.members.filter(m => m.id !== interaction.user.id).map(m => ({
              label: m.user.username,
              value: m.id,
              description: `Kick ${m.user.username}`
            }));
            if (!options.length) {
              await interaction.reply({ content: "No other members to kick.", flags: MessageFlags.Ephemeral });
              return;
            }
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId("vc_kick_select")
              .setPlaceholder("Select a user to kick")
              .addOptions(options);
            await interaction.reply({ content: "Select a user to kick:", components: [new ActionRowBuilder().addComponents(selectMenu)], flags: MessageFlags.Ephemeral });
            return;
          }
          case "vc_info":
            await interaction.reply({
              content: `Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "∞"}`,
              flags: MessageFlags.Ephemeral
            });
            return;
case "vc_trust": {
  // Filter members not in the VC, excluding bots and the interaction user
  const notInVc = interaction.guild.members.cache.filter(
    m => !m.user.bot && m.id !== interaction.user.id && !channel.members.has(m.id)
  );

  if (!notInVc.size) {
    await interaction.reply({ content: "No users available to trust.", ephemeral: true });
    return;
  }
  const menu = new UserSelectMenuBuilder()
    .setCustomId("vc_trust_select")
    .setPlaceholder("Select users to trust")
    .setMinValues(1) 
    .setMaxValues(Math.min(25, notInVc.size));
    
  await interaction.reply({
    content: "Select users to trust",
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true
  });
  return;
}
          case "vc_untrust": {
            const vcData = client.vcData.get(channel.id) || { trusted: [], blocked: [] };
            if (!vcData.trusted.length) {
              await interaction.reply({ content: "No trusted users.", flags: MessageFlags.Ephemeral });
              return;
            }
            const options = vcData.trusted
              .map(id => {
                const m = interaction.guild.members.cache.get(id);
                return { label: m ? m.user.username : `Unknown (${id})`, value: id };
              });
            const menu = new StringSelectMenuBuilder()
              .setCustomId("vc_untrust_select")
              .setPlaceholder("Select users to untrust")
              .addOptions(options);
            await interaction.reply({ content: "Select users to remove from trusted", components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
            return;
          }
          // Block users select menu
          case "vc_block": {
  // Users outside VC and excluding the interaction user
  const notInVc = interaction.guild.members.cache.filter(
    m => !m.user.bot && m.id !== interaction.user.id && !channel.members.has(m.id)
  );

  if (!notInVc.size) {
    await interaction.reply({ content: "No users available to block.", ephemeral: true });
    return;
  }

  // Create a User Select Menu
  const menu = new UserSelectMenuBuilder()
    .setCustomId("vc_block_select")
    .setPlaceholder("Select users to block")
    .setMinValues(1) // Minimum users to select
    .setMaxValues(Math.min(25, notInVc.size)); // Max selectable users (Discord limit: 25)

  // Send the menu in an ephemeral reply
  await interaction.reply({
    content: "Select users to block",
    components: [new ActionRowBuilder().addComponents(menu)],
    ephemeral: true
  });
  return;
}

          case "vc_unblock": {
            const vcData = client.vcData.get(channel.id) || { trusted: [], blocked: [] };
            if (!vcData.blocked.length) {
              await interaction.reply({ content: "No blocked users.", flags: MessageFlags.Ephemeral });
              return;
            }
            const options = vcData.blocked
              .map(id => {
                const m = interaction.guild.members.cache.get(id);
                return { label: m ? m.user.username : `Unknown (${id})`, value: id };
              });
            const menu = new StringSelectMenuBuilder()
              .setCustomId("vc_unblock_select")
              .setPlaceholder("Select users to unblock")
              .addOptions(options);
            await interaction.reply({ content: "Select users to unblock", components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral });
            return;
          }
                                case "vc_waiting": {
  const guild = interaction.guild;
  const owner = interaction.member;
  let categoryId = channel.parentId;
  if (!categoryId && VoiceConfig) {
    const config = await VoiceConfig.findOne({ guildID: guild.id });
    if (config) categoryId = config.categoryID;
  }
  const waitingChannel = await guild.channels.create({
    name: `${owner.displayName} Waiting`,
    type: 2,
    parent: categoryId || undefined,
    reason: "TempVoice Waiting Room Created",
    userLimit: 2,
    permissionOverwrites: [
      { id: guild.roles.everyone, allow: ["Connect", "ViewChannel"] },
      { id: owner.id, allow: ["Connect", "ViewChannel"] },
    ]
  });
  if (!client.waitingRooms) client.waitingRooms = new Map();
  client.waitingRooms.set(waitingChannel.id, { ownerId: owner.id, ownerVcId: channel.id });
  await interaction.reply({ content: `Created waiting channel: ${waitingChannel.name}`, flags: MessageFlags.Ephemeral });
  return;
}
case "vc_invite": {
  const userSelectMenu = new UserSelectMenuBuilder()
    .setCustomId("vc_invite_select")
    .setPlaceholder("Select a user to invite")
    .setMinValues(1)
    .setMaxValues(25);

  const row = new ActionRowBuilder().addComponents(userSelectMenu);

  await interaction.reply({
    content: "Select user(s) to invite (they will get a DM with an invite link):",
    components: [row],
    flags: MessageFlags.Ephemeral
  });
  return;
}
          case "vc_delete": {
            await channel.delete().catch(() => { });
            await interaction.reply({ content: "Your voice channel was deleted.", flags: MessageFlags.Ephemeral });
            return;
          }
case "vc_transfer": {
  const guild = interaction.guild;
  const vcID = client.tempVoice?.get(interaction.user.id);
  if (!vcID) {
    await interaction.reply({ content: "You don't currently own a voice channel.", flags: MessageFlags.Ephemeral });
    return;
  }
  const vcChannel = guild.channels.cache.get(vcID);
  if (!vcChannel) {
    await interaction.reply({ content: "Your voice channel was not found.", flags: MessageFlags.Ephemeral });
    return;
  }
  const currentOwnerId = client.vcOwners.get(vcID);
  if (interaction.user.id !== currentOwnerId) {
    await interaction.reply({ content: "Only the current owner can transfer ownership.", flags: MessageFlags.Ephemeral });
    return;
  }

  const membersToChoose = vcChannel.members.filter(m => m.id !== currentOwnerId && !m.user.bot);
  if (!membersToChoose.size) {
    await interaction.reply({ content: "No other members to transfer ownership to.", flags: MessageFlags.Ephemeral });
    return;
  }

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId("vc_transfer_select")
    .setPlaceholder("Select a new owner")
    .setMinValues(1)
    .setMaxValues(1);
  const options = membersToChoose.map(m => ({
    label: m.user.username,
    value: m.id
  }));
  const row = new ActionRowBuilder().addComponents(userSelect);
  await interaction.reply({ content: "Select a new owner for your VC:", components: [row], flags: MessageFlags.Ephemeral });
  return;
}

            case "vc_region": {
            const regions = [
              { label: "Automatic", value: "auto" },
              { label: "India", value: "india" },
              { label: "Singapore", value: "singapore" },
              { label: "Europe", value: "europe" },
              { label: "US East", value: "us-east" },
              { label: "US West", value: "us-west" },
            ];
            const options = regions.map(r => ({ label: r.label, value: r.value }));
            const select = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder().setCustomId("vc_region_select").setPlaceholder("Select a region").addOptions(options)
            );
            return interaction.reply({ content: "Select a voice region to set (if supported):", components: [select], flags: MessageFlags.Ephemeral });
          }
          default: {
            await interaction.reply({ content: "Unknown VC control.", flags: MessageFlags.Ephemeral });
            return;
          }
        }
      } catch (err) {
        console.error("Error handling VC button:", err);
        if (!interaction.replied) {
          await interaction.reply({ content: "Error processing the command.", flags: MessageFlags.Ephemeral });
        }
      }
    }

      if (interaction.isUserSelectMenu() && interaction.customId === "vc_invite_select") {
  const vcID = client.tempVoice?.get(interaction.user.id);
  const channel = vcID ? interaction.guild.channels.cache.get(vcID) : null;
  if (!channel) {
    await interaction.reply({ content: "Your personal VC was not found.", flags: MessageFlags.Ephemeral });
    return;
  }
  const guildId = interaction.guild.id;
  const channelId = channel.id;

  if (!interaction.values?.length) {
    await interaction.reply({ content: "No users selected.", flags: MessageFlags.Ephemeral });
    return;
  }

  let invited = [];
  for (const userId of interaction.values) {
    const user = await interaction.client.users.fetch(userId).catch(() => null);
    if (!user) continue;
    try {
      await user.send(`You are invited to join the voice channel **${channel.name}** in **${interaction.guild.name}**!\nJoin using this link: https://discord.com/channels/${guildId}/${channelId}`);
      invited.push(`<@${user.id}>`);
    } catch {}
  }
  await interaction.reply({
    content: invited.length ? `Invited: ${invited.join(", ")}` : "Could not send invite DMs (maybe DMs closed).",
    flags: MessageFlags.Ephemeral
  });
  return;
}

      
      if (interaction.isUserSelectMenu() && interaction.customId === "vc_transfer_select") {
  // This is the transfer ownership selection from above

  const vcID = client.tempVoice?.get(interaction.user.id);
  const guild = interaction.guild;
  if (!vcID) {
    await interaction.reply({ content: "You don't currently own a voice channel.", flags: MessageFlags.Ephemeral });
    return;
  }
  const vcChannel = guild.channels.cache.get(vcID);
  if (!vcChannel) {
    await interaction.reply({ content: "Voice channel not found.", flags: MessageFlags.Ephemeral });
    return;
  }
  const currentOwnerId = client.vcOwners.get(vcID);
  if (interaction.user.id !== currentOwnerId) {
    await interaction.reply({ content: "Only the current owner can transfer ownership.", flags: MessageFlags.Ephemeral });
    return;
  }

  const newOwnerId = interaction.values[0];
  if (!vcChannel.members.has(newOwnerId)) {
    await interaction.reply({ content: "Selected user is not in your VC.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    client.vcOwners.set(vcID, newOwnerId);
    const overwrites = [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: newOwnerId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ManageChannels],
      },
      ...vcChannel.members.filter(m => m.id !== newOwnerId).map(m => ({ id: m.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] })),
    ];
    await vcChannel.permissionOverwrites.set(overwrites).catch(() => {});

    client.tempVoice.set(newOwnerId, vcID);
     client.vcOwners.set(vcID, newOwnerId);
      const h = client.users.cache.get(newOwnerId);
    client.tempVoice.delete(currentOwnerId);
      vcChannel.setName(h.displayName)
    await interaction.reply({ content: `Ownership transferred to <@${newOwnerId}>.`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error("Transfer ownership error:", err);
    await interaction.reply({ content: "Failed to transfer ownership.", flags: MessageFlags.Ephemeral });
  }
  return;
}

      
    // Select Menu Handler
    if (interaction.isStringSelectMenu()) {
      const vcID = client.tempVoice?.get(interaction.user.id);
      if (!interaction.customId.startsWith("vc_")) return;
      const guild = interaction.guild;
      const channel = vcID ? guild.channels.cache.get(vcID) : null;
      if (!channel) {
        await interaction.reply({ content: "Your personal VC was not found.", flags: MessageFlags.Ephemeral });
        return;
      }
      const ownerId = client.vcOwners?.get(channel.id);
      if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: `Only the VC owner can use this control. VC owner: <@${ownerId || "none"}>`, flags: MessageFlags.Ephemeral });
        return;
      }
      const vcData = client.vcData.get(channel.id) || { trusted: [], blocked: [] };

      switch (interaction.customId) {
        // Kick user
        case "vc_kick_select": {
          const toKickId = interaction.values[0];
          const member = channel.members.get(toKickId);
          if (!member) {
            await interaction.reply({ content: "User not found in your VC.", flags: MessageFlags.Ephemeral });
            return;
          }
          try {
            await member.voice.disconnect();
            await interaction.reply({ content: `<@${toKickId}> has been kicked from your VC.`, flags: MessageFlags.Ephemeral });
            return;
          } catch {
            await interaction.reply({ content: "Failed to kick member.", flags: MessageFlags.Ephemeral });
            return;
          }
        }

case "vc_trust_select": {
  const channel = interaction.channel;
  if (!channel) return;
  const vcData = client.vcData.get(channel.id) || { trusted: [] };
  for (const userId of interaction.values) {
    if (!vcData.trusted.includes(userId)) vcData.trusted.push(userId);

    try {
      await channel.permissionOverwrites.edit(userId, {
        Connect: true,
        ViewChannel: true
      });
    } catch (err) {
      console.error(`Failed to update permissions for ${userId}:`, err);
    }
  }
  client.vcData.set(channel.id, vcData);
  await interaction.reply({
    content: `Trusted: ${interaction.values.map(id => `<@${id}>`).join(", ")}`,
    ephemeral: true
  });
  return;
}

        // Untrust user
        case "vc_untrust_select": {
          vcData.trusted = vcData.trusted.filter(id => !interaction.values.includes(id));
          for (const userId of interaction.values)
            await channel.permissionOverwrites.delete(userId).catch(() => {});
          client.vcData.set(channel.id, vcData);
          await interaction.reply({ content: `Untrusted: ${interaction.values.map(id => `<@${id}>`).join(", ")}`, flags: MessageFlags.Ephemeral });
          return;
        }
case "vc_block_select": {
  const channel = interaction.channel;
  if (!channel) return;
  const vcData = client.vcData.get(channel.id) || { blocked: [] };
  for (const userId of interaction.values) {
    if (!vcData.blocked.includes(userId)) vcData.blocked.push(userId);
    try {
      await channel.permissionOverwrites.edit(userId, { Connect: false });
    } catch (err) {
      console.error(`Failed to block ${userId}:`, err);
    }
    const member = channel.members.get(userId);
    if (member) {
      try {
        await member.voice.disconnect();
      } catch (err) {
        console.error(`Failed to disconnect ${userId}:`, err);
      }
    }
  }
  client.vcData.set(channel.id, vcData);
  await interaction.reply({
    content: `Blocked: ${interaction.values.map(id => `<@${id}>`).join(", ")}`,
    ephemeral: true
  });

  return;
}

        // Unblock user
        case "vc_unblock_select": {
          vcData.blocked = vcData.blocked.filter(id => !interaction.values.includes(id));
          for (const userId of interaction.values)
            await channel.permissionOverwrites.delete(userId).catch(() => {});
          client.vcData.set(channel.id, vcData);
          await interaction.reply({ content: `Unblocked: ${interaction.values.map(id => `<@${id}>`).join(", ")}`, flags: MessageFlags.Ephemeral });
          return;
        }
                    case "vc_region_select": {
        const selected = interaction.values[0];
        try {
          if (typeof channel.setRTCRegion === "function") {
            const regionArg = selected === "auto" ? null : selected;
            await channel.setRTCRegion(regionArg).catch(() => { });
          }
        } catch (err) {
          console.error("Region set error:", err);
          return interaction.reply({ content: "Failed to set region (missing permission or unsupported).", flags: MessageFlags.Ephemeral });
        }
        try {
          const cfg = await VoiceConfig.findOne({ guildID: guild.id });
          if (cfg && cfg.voiceChannels.get(channel.id)) {
            const vcData = cfg.voiceChannels.get(channel.id);
            vcData.region = selected;
            cfg.voiceChannels.set(channel.id, vcData);
            await cfg.save();
          }
        } catch (e) {
          console.error("persist region error:", e);
        }

        return interaction.reply({ content: `Voice region set to ${selected === "auto" ? "Automatic" : selected}.`, flags: MessageFlags.Ephemeral });
      }
        case "vc_privacy_options": {
          const selected = interaction.values[0];
          switch (selected) {
            case "lock":
              await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
              await interaction.reply({ content: "Channel locked (trusted only).", flags: MessageFlags.Ephemeral });
              break;
            case "unlock":
              await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
              await interaction.reply({ content: "Channel unlocked (everyone).", flags: MessageFlags.Ephemeral });
              break;
            case "invisible":
              await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
              await interaction.reply({ content: "Channel invisible (trusted only).", flags: MessageFlags.Ephemeral });
              break;
            case "visible":
              await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
              await interaction.reply({ content: "Channel visible (everyone).", flags: MessageFlags.Ephemeral });
              break;
            case "close_chat":
              await interaction.reply({ content: "Chat close feature not implemented.", flags: MessageFlags.Ephemeral });
              break;
            default:
              await interaction.reply({ content: "Unknown privacy option.", flags: MessageFlags.Ephemeral });
          }
          return;
        }
        default:
          await interaction.reply({ content: "Unknown select menu option.", flags: MessageFlags.Ephemeral });
          return;
      }
    }
  },
};
