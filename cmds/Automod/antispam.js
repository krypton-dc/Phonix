const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const AntiSpam = require("@data/antispam");

module.exports = {
  name: "antispam",
  aliases: ["antis", "as"],
  description: "Enable or disable the Anti-Spam system and manage settings.",
  category: "Automod",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageRoles", "ModerateMembers"],
  cooldown: 5,

  execute: async (message, args, client, prefix) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ) {
      return message.reply({
        content: "You need `Manage Guild` permissions to use this command.",
        ephemeral: true,
      });
    }

    const guildId = message.guild.id;
    const userId = message.author.id;

    let antiSpamData = await AntiSpam.findOne({ guildId });
    if (!antiSpamData) {
      antiSpamData = new AntiSpam({
        guildId,
        isEnabled: false,
        messageThreshold: 5,
        timeframe: 10,
        punishment: "timeout",
        logChannel: null,
        whitelistUsers: [],
        whitelistRoles: [],
        whitelistChannels: [],
      });
      await antiSpamData.save();
    }

    const mainContainer = createMainContainer(antiSpamData, client);

    const mainMessage = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [mainContainer],
    });

    const collector = mainMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      await interaction.deferUpdate();

      let container = new ContainerBuilder();

      switch (interaction.customId) {
        case "antispam_toggle":
          await handleToggle(interaction, antiSpamData);
          break;

        case "antispam_manage_threshold":
        case "antispam_manage_punishment":
        case "antispam_manage_whitelist":
        case "antispam_back_main":
        case "antispam_back_whitelist":
          await handleMainMenu(interaction, antiSpamData, interaction.customId);
          break;

        case "antispam_whitelist_add_user":
        case "antispam_whitelist_add_role":
        case "antispam_whitelist_add_channel":
          container = createAddWhitelistContainer(interaction.customId);
          await interaction.editReply({ components: [container] });
          break;

        case "antispam_whitelist_remove":
          container = createRemoveWhitelistContainer(
            antiSpamData,
            message.guild
          );
          await interaction.editReply({ components: [container] });
          break;

        case "antispam_select_add_user":
        case "antispam_select_add_role":
        case "antispam_select_add_channel":
          await handleWhitelistAddition(interaction, antiSpamData);
          break;

        case "antispam_select_remove_user":
        case "antispam_select_remove_role":
        case "antispam_select_remove_channel":
          await handleWhitelistRemoval(interaction, antiSpamData);
          break;

        case "antispam_select_punishment":
          await handlePunishmentSelection(interaction, antiSpamData);
          break;

        case "antispam_manage_logs":
          await handleLogs(interaction, antiSpamData);
          break;

        case "antispam_select_log_channel":
          await handleLogChannelSelection(interaction, antiSpamData);
          break;

        case "antispam_remove_log_channel":
          await handleRemoveLogChannel(interaction, antiSpamData);
          break;

        default:
          break;
      }
    });

    collector.on("end", async () => {
      const disabledContainer = createDisabledContainer("time");
      await mainMessage
        .edit({
          components: [disabledContainer],
        })
        .catch(() => {});
    });
  },
};

async function handleMainMenu(interaction, antiSpamData, customId) {
  let container;
  switch (customId) {
    case "antispam_manage_threshold":
      container = createManageThresholdContainer(antiSpamData);
      await interaction.editReply({ components: [container] });

      const messageCollector = interaction.channel.createMessageCollector({
        filter: (msg) => msg.author.id === interaction.user.id,
        time: 60000,
        max: 1,
      });

      messageCollector.on("collect", async (msg) => {
        const args = msg.content.trim().split(/\s+/);

        if (args.length !== 2) {
          await msg
            .reply({
              content:
                "❌ Please provide exactly 2 numbers: `<messages> <seconds>`\nExample: `5 10`",
            })
            .then((m) => {
              setTimeout(() => {
                m.delete().catch(() => {});
              }, 5000);
            });
          return;
        }

        const messageThreshold = parseInt(args[0]);
        const timeframe = parseInt(args[1]);

        if (
          isNaN(messageThreshold) ||
          isNaN(timeframe) ||
          messageThreshold < 1 ||
          timeframe < 1
        ) {
          await msg
            .reply({
              content:
                "❌ Please provide valid positive numbers.\nExample: `5 10`",
            })
            .then((m) => {
              setTimeout(() => {
                m.delete().catch(() => {});
              }, 5000);
            });
          return;
        }

        if (messageThreshold > 50 || timeframe > 300) {
          await msg
            .reply({
              content: "❌ Values too high! Maximum: 50 messages, 300 seconds",
            })
            .then((m) => {
              setTimeout(() => {
                m.delete().catch(() => {});
              }, 5000);
            });
          return;
        }

        // Update the threshold
        antiSpamData.messageThreshold = messageThreshold;
        antiSpamData.timeframe = timeframe;
        antiSpamData.updatedAt = new Date();
        await antiSpamData.save();

        await msg
          .reply({
            content: ` Threshold updated to **${messageThreshold} messages** in **${timeframe} seconds**`,
          })
          .then((m) => {
            setTimeout(() => {
              m.delete().catch(() => {});
            }, 5000);
          });

        // Delete the user's input message
        try {
          await msg.delete();
        } catch (e) {
          // Ignore if we can't delete (missing permissions)
        }

        // Update the interface to show the main menu
        const mainContainer = createMainContainer(
          antiSpamData,
          interaction.client
        );
        await interaction.editReply({ components: [mainContainer] });
      });

      messageCollector.on("end", (collected) => {
        if (collected.size === 0) {
          // No input received, go back to main menu
          const mainContainer = createMainContainer(
            antiSpamData,
            interaction.client
          );
          interaction
            .editReply({ components: [mainContainer] })
            .catch(() => {});
        }
      });
      break;

    case "antispam_manage_punishment":
      container = createManagePunishmentContainer(antiSpamData);
      break;

    case "antispam_manage_whitelist":
    case "antispam_back_whitelist":
      container = createWhitelistManagerContainer(antiSpamData);
      break;

    case "antispam_back_main":
    default:
      container = createMainContainer(antiSpamData, interaction.client);
      break;
  }
  await interaction.editReply({ components: [container] });
}

function createMainContainer(antiSpamData, client) {
  const container = new ContainerBuilder();
  const status = antiSpamData.isEnabled
    ? `<:Phonix_tick:1247835721583300609>`
    : `<:Phonix_cross:1247835724904923197>`;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## Anti-Spam System\n\n` +
        `**Status:** ${status}\n` +
        `**Threshold:** ${antiSpamData.messageThreshold} messages in ${antiSpamData.timeframe} seconds\n` +
        `**Punishment:** ${antiSpamData.punishment}\n` +
        `**Whitelisted:** Users: ${antiSpamData.whitelistUsers.length}, Roles: ${antiSpamData.whitelistRoles.length}, Channels: ${antiSpamData.whitelistChannels.length}\n` +
        `**Log Channel:** ${antiSpamData.logChannel ? `<#${antiSpamData.logChannel}>` : "None"}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Last Updated: ${antiSpamData.updatedAt?.toLocaleString() || "Never"}`
    )
  );

  const mainButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_toggle")
      .setLabel(antiSpamData.isEnabled ? "Disable" : "Enable")
      .setStyle(
        antiSpamData.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success
      ),
    new ButtonBuilder()
      .setCustomId("antispam_manage_threshold")
      .setLabel("Set Threshold")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("antispam_manage_punishment")
      .setLabel("Set Punishment")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("antispam_manage_whitelist")
      .setLabel("Manage Whitelist")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("antispam_manage_logs")
      .setLabel("Log Settings")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(mainButtons);
  return container;
}

function createManageThresholdContainer(antiSpamData) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Set Spam Detection Threshold**\n\n` +
        `Current: **${antiSpamData.messageThreshold} messages** in **${antiSpamData.timeframe} seconds**\n\n` +
        `**How to use:**\n` +
        `Reply with two numbers separated by a space:\n` +
        `\`<messages> <seconds>\`\n\n` +
        `**Example:** \`5 10\` (5 messages in 10 seconds)\n` +
        `**Limits:** 1-50 messages, 1-300 seconds\n\n` +
        `⏰ You have 60 seconds to reply.`
    )
  );

  const backButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_main")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(backButtonRow);
  return container;
}

/**
 * Creates the punishment manager container.
 * @param {object} antiSpamData
 * @returns {ContainerBuilder}
 */
function createManagePunishmentContainer(antiSpamData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Set Punishment**\n\n` +
        `Current punishment: **${antiSpamData.punishment}**`
    )
  );

  const punishmentSelectMenu = new StringSelectMenuBuilder()
    .setCustomId("antispam_select_punishment")
    .setPlaceholder("Select a punishment type")
    .addOptions(
      { label: "None", value: "none" },
      { label: "Timeout", value: "timeout" },
      { label: "Kick", value: "kick" },
      { label: "Ban", value: "ban" }
    );

  const selectRow = new ActionRowBuilder().addComponents(punishmentSelectMenu);

  const backButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_main")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow, backButtonRow);
  return container;
}

/**
 * Creates the whitelist manager container.
 * @param {object} antiSpamData
 * @returns {ContainerBuilder}
 */
function createWhitelistManagerContainer(antiSpamData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## Anti-Spam Whitelist Manager\n\n` +
        `**Whitelisted Users:** ${antiSpamData.whitelistUsers.length}\n` +
        `**Whitelisted Roles:** ${antiSpamData.whitelistRoles.length}\n` +
        `**Whitelisted Channels:** ${antiSpamData.whitelistChannels.length}`
    )
  );

  const addButtonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_whitelist_add_user")
      .setLabel("Add User")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("antispam_whitelist_add_role")
      .setLabel("Add Role")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("antispam_whitelist_add_channel")
      .setLabel("Add Channel")
      .setStyle(ButtonStyle.Success)
  );

  const removeButtonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_whitelist_remove")
      .setLabel("Remove Items")
      .setStyle(ButtonStyle.Danger)
  );

  const backButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_main")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(
    addButtonsRow,
    removeButtonsRow,
    backButtonRow
  );
  return container;
}

/**
 * Creates the container for adding items to the whitelist.
 * @param {string} customId
 * @returns {ContainerBuilder}
 */
function createAddWhitelistContainer(customId) {
  const container = new ContainerBuilder();
  let selectMenu, placeholder, typeName;

  if (customId === "antispam_whitelist_add_user") {
    selectMenu = new UserSelectMenuBuilder()
      .setCustomId("antispam_select_add_user")
      .setMaxValues(25);
    placeholder = "Select user(s) to whitelist";
    typeName = "user";
  } else if (customId === "antispam_whitelist_add_role") {
    selectMenu = new RoleSelectMenuBuilder()
      .setCustomId("antispam_select_add_role")
      .setMaxValues(25);
    placeholder = "Select role(s) to whitelist";
    typeName = "role";
  } else if (customId === "antispam_whitelist_add_channel") {
    selectMenu = new ChannelSelectMenuBuilder()
      .setCustomId("antispam_select_add_channel")
      .setMaxValues(25);
    placeholder = "Select channel(s) to whitelist";
    typeName = "channel";
  }

  selectMenu.setPlaceholder(placeholder).setMinValues(1);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Select the ${typeName}(s) to add to the whitelist:`
    )
  );

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_whitelist")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow, backRow);
  return container;
}

/**
 * Creates the container for removing items from the whitelist.
 * @param {object} antiSpamData
 * @param {object} guild
 * @returns {ContainerBuilder}
 */
function createRemoveWhitelistContainer(antiSpamData, guild) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Select items to remove from the whitelist:**`
    )
  );

  const userOptions = antiSpamData.whitelistUsers
    .map((id) => guild.members.cache.get(id))
    .filter((member) => member)
    .map((member) => ({ label: member.user.tag, value: member.id }));

  const roleOptions = antiSpamData.whitelistRoles
    .map((id) => guild.roles.cache.get(id))
    .filter((role) => role)
    .map((role) => ({ label: role.name, value: role.id }));

  const channelOptions = antiSpamData.whitelistChannels
    .map((id) => guild.channels.cache.get(id))
    .filter((channel) => channel)
    .map((channel) => ({ label: channel.name, value: channel.id }));

  const componentRows = [];

  if (userOptions.length > 0) {
    const userSelect = new StringSelectMenuBuilder()
      .setCustomId("antispam_select_remove_user")
      .setPlaceholder("Select user(s) to remove")
      .setMinValues(0)
      .setMaxValues(userOptions.length)
      .addOptions(userOptions);
    componentRows.push(new ActionRowBuilder().addComponents(userSelect));
  }

  if (roleOptions.length > 0) {
    const roleSelect = new StringSelectMenuBuilder()
      .setCustomId("antispam_select_remove_role")
      .setPlaceholder("Select role(s) to remove")
      .setMinValues(0)
      .setMaxValues(roleOptions.length)
      .addOptions(roleOptions);
    componentRows.push(new ActionRowBuilder().addComponents(roleSelect));
  }

  if (channelOptions.length > 0) {
    const channelSelect = new StringSelectMenuBuilder()
      .setCustomId("antispam_select_remove_channel")
      .setPlaceholder("Select channel(s) to remove")
      .setMinValues(0)
      .setMaxValues(channelOptions.length)
      .addOptions(channelOptions);
    componentRows.push(new ActionRowBuilder().addComponents(channelSelect));
  }

  if (componentRows.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `There are no whitelisted items to remove.`
      )
    );
  } else {
    container.addActionRowComponents(...componentRows);
  }

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_whitelist")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(backRow);
  return container;
}

/**
 * Creates the log settings container.
 * @param {object} antiSpamData
 * @returns {ContainerBuilder}
 */
function createLogSettingsContainer(antiSpamData) {
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## Log Settings\n\n` +
        `**Current Log Channel:** ${antiSpamData.logChannel ? `<#${antiSpamData.logChannel}>` : "None"}\n\n` +
        `Select a text channel below to send anti-spam logs to, or remove the current log channel.`
    )
  );

  const logChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("antispam_select_log_channel")
    .setPlaceholder("Select a text channel for logs")
    .setChannelTypes([ChannelType.GuildText])
    .setMinValues(1)
    .setMaxValues(1);

  const selectRow = new ActionRowBuilder().addComponents(logChannelSelect);

  const buttonRow = new ActionRowBuilder();

  if (antiSpamData.logChannel) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId("antispam_remove_log_channel")
        .setLabel("Remove Log Channel")
        .setStyle(ButtonStyle.Danger)
    );
  }

  buttonRow.addComponents(
    new ButtonBuilder()
      .setCustomId("antispam_back_main")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow, buttonRow);
  return container;
}

// ===================================
// Helper Functions for Handling Interactions
// ===================================

/**
 * Handles toggling the anti-spam system.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handleToggle(interaction, antiSpamData) {
  // Toggle the current state instead of always setting to true
  antiSpamData.isEnabled = !antiSpamData.isEnabled;
  antiSpamData.updatedAt = new Date();
  await antiSpamData.save();

  // Provide feedback about the action
  const status = antiSpamData.isEnabled ? "enabled" : "disabled";
  await interaction.followUp({
    content: ` Anti-spam system has been **${status}** successfully.`,
    ephemeral: true,
  });

  const container = createMainContainer(antiSpamData, interaction.client);
  await interaction.editReply({ components: [container] });
}

/**
 * Handles adding items to the whitelist via select menus.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handleWhitelistAddition(interaction, antiSpamData) {
  const { values, customId } = interaction;
  let field, typeName;

  if (customId === "antispam_select_add_user") {
    field = "whitelistUsers";
    typeName = "user";
  } else if (customId === "antispam_select_add_role") {
    field = "whitelistRoles";
    typeName = "role";
  } else if (customId === "antispam_select_add_channel") {
    field = "whitelistChannels";
    typeName = "channel";
  }

  const addedItems = [];
  antiSpamData[field] = antiSpamData[field] || [];

  for (const id of values) {
    if (!antiSpamData[field].includes(id)) {
      antiSpamData[field].push(id);
      addedItems.push(id);
    }
  }

  antiSpamData.updatedAt = new Date();
  await antiSpamData.save();

  if (addedItems.length > 0) {
    await interaction.followUp({
      content: ` Successfully added ${addedItems.length} ${typeName}(s) to the whitelist.`,
      ephemeral: true,
    });
  } else {
    await interaction.followUp({
      content: `All selected ${typeName}(s) were already in the whitelist.`,
      ephemeral: true,
    });
  }

  const container = createWhitelistManagerContainer(antiSpamData);
  await interaction.editReply({ components: [container] });
}

/**
 * Handles removing items from the whitelist via select menus.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handleWhitelistRemoval(interaction, antiSpamData) {
  const { values, customId } = interaction;
  let field, typeName;

  if (customId === "antispam_select_remove_user") {
    field = "whitelistUsers";
    typeName = "user";
  } else if (customId === "antispam_select_remove_role") {
    field = "whitelistRoles";
    typeName = "role";
  } else if (customId === "antispam_select_remove_channel") {
    field = "whitelistChannels";
    typeName = "channel";
  }

  const initialCount = antiSpamData[field].length;
  antiSpamData[field] = antiSpamData[field].filter(
    (id) => !values.includes(id)
  );
  const removedCount = initialCount - antiSpamData[field].length;

  antiSpamData.updatedAt = new Date();
  await antiSpamData.save();

  if (removedCount > 0) {
    await interaction.followUp({
      content: ` Successfully removed ${removedCount} ${typeName}(s) from the whitelist.`,
      ephemeral: true,
    });
  } else {
    await interaction.followUp({
      content: `No ${typeName}(s) were removed.`,
      ephemeral: true,
    });
  }

  const container = createWhitelistManagerContainer(antiSpamData);
  await interaction.editReply({ components: [container] });
}

/**
 * Handles the selection of a punishment type.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handlePunishmentSelection(interaction, antiSpamData) {
  const { values } = interaction;
  const newPunishment = values[0];

  antiSpamData.punishment = newPunishment;
  antiSpamData.updatedAt = new Date();
  await antiSpamData.save();

  await interaction.followUp({
    content: ` The punishment has been updated to **${newPunishment}** successfully.`,
    ephemeral: true,
  });

  const container = createMainContainer(antiSpamData, interaction.client);
  await interaction.editReply({ components: [container] });
}

/**
 * Handles showing the log settings menu.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handleLogs(interaction, antiSpamData) {
  const container = createLogSettingsContainer(antiSpamData);
  await interaction.editReply({ components: [container] });
}

async function handleLogChannelSelection(interaction, antiSpamData) {
  try {
    const newLogChannel = interaction.values[0];

    const channel = interaction.guild.channels.cache.get(newLogChannel);
    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.followUp({
        content: `❌ Please select a valid text channel for logging.`,
        ephemeral: true,
      });
      return;
    }

    // Update the database
    antiSpamData.logChannel = newLogChannel;
    antiSpamData.updatedAt = new Date();
    await antiSpamData.save();

    // Verify the save was successful by refetching
    const updatedData = await AntiSpam.findOne({
      guildId: interaction.guild.id,
    });

    await interaction.followUp({
      content: ` The log channel has been set to <#${newLogChannel}> successfully.`,
      ephemeral: true,
    });

    // Return to main menu with updated data
    const container = createMainContainer(updatedData, interaction.client);
    await interaction.editReply({ components: [container] });
  } catch (error) {
    console.error("Error handling log channel selection:", error);
    await interaction.followUp({
      content: `❌ An error occurred while setting the log channel. Please try again.`,
      ephemeral: true,
    });
  }
}

/**
 * Handles removing the log channel.
 * @param {object} interaction
 * @param {object} antiSpamData
 */
async function handleRemoveLogChannel(interaction, antiSpamData) {
  try {
    antiSpamData.logChannel = null;
    antiSpamData.updatedAt = new Date();
    await antiSpamData.save();

    await interaction.followUp({
      content: ` The log channel has been removed successfully.`,
      ephemeral: true,
    });

    const container = createMainContainer(antiSpamData, interaction.client);
    await interaction.editReply({ components: [container] });
  } catch (error) {
    console.error("Error removing log channel:", error);
    await interaction.followUp({
      content: `❌ An error occurred while removing the log channel. Please try again.`,
      ephemeral: true,
    });
  }
}

/**
 * Creates a disabled container for when the collector ends.
 * @param {string} reason
 * @returns {ContainerBuilder}
 */
function createDisabledContainer(reason) {
  const container = new ContainerBuilder();
  const reasonText = reason === "time" ? "Session Expired" : "Session Ended";
  const disabledButton = new ButtonBuilder()
    .setCustomId("disabled")
    .setLabel(reasonText)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${reasonText}**\nThis interface has been disabled.`
    )
  );

  const row = new ActionRowBuilder().addComponents(disabledButton);
  container.addActionRowComponents(row);

  return container;
}
