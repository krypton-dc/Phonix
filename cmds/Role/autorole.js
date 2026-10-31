const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");
const AutoRole = require("@data/autorole");

module.exports = {
  name: "autorole",
  category: "Role",
  aliases: ["atr"],
  description: "Configure and manage auto-roles for humans and bots.",
  userPerms: ["Administrator"],
  botParams: ["SendMessages", "Administrator"],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;

      let autoRoleData = await AutoRole.findOne({ guildId });
      if (!autoRoleData) {
        autoRoleData = new AutoRole({ guildId });
        await autoRoleData.save();
      }

      // Create main interface
      const container = createMainContainer(
        autoRoleData,
        message.guild,
        client
      );

      const mainMessage = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      // Main collector with proper error handling
      const collector = mainMessage.createMessageComponentCollector({
        time: 300000, // 5 minutes
        filter: (i) => {
          if (i.user.id !== userId) {
            i.reply({
              content: `Only ${message.author} can use this interface.`,
              ephemeral: true,
            }).catch(() => {});
            return false;
          }
          return true;
        },
      });

      collector.on("collect", async (interaction) => {
        try {
          await handleMainInteraction(
            interaction,
            client,
            autoRoleData,
            mainMessage
          );
        } catch (error) {
          console.error("Interaction error:", error);

          // Only respond if interaction hasn't been replied to or deferred
          if (!interaction.replied && !interaction.deferred) {
            try {
              const errorContainer = new ContainerBuilder();
              errorContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `**Error**\nAn error occurred while processing your request.`
                )
              );

              await interaction.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [errorContainer],
                ephemeral: true,
              });
            } catch (replyError) {
              console.error("Failed to send error reply:", replyError);
            }
          }
        }
      });

      // Enhanced cleanup
      collector.on("end", async (collected, reason) => {
        try {
          const disabledContainer = createDisabledContainer(reason, client);
          await mainMessage
            .edit({
              flags: MessageFlags.IsComponentsV2,
              components: [disabledContainer],
            })
            .catch(() => {});
        } catch (error) {
          console.error("Error disabling components:", error);
        }

        console.log(
          `AutoRole interface ended: ${reason} (${collected.size} interactions)`
        );
      });
    } catch (error) {
      console.error("AutoRole command error:", error);
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**System Error**\nFailed to initialize the AutoRole system.`
        )
      );

      await message
        .reply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer],
        })
        .catch(() => {});
    }
  },
};

function createMainContainer(autoRoleData, guild, client) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# **AutoRole System - ${client.user.username}**\nAutomatic role assignment for new members`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Human Roles:** ${
        autoRoleData.humanRoles ? autoRoleData.humanRoles.length : 0
      } | **Bot Roles:** ${
        autoRoleData.botRoles ? autoRoleData.botRoles.length : 0
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Current configuration section
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Configured Human Roles:**\n${formatRoles(autoRoleData.humanRoles, guild)}`
    )
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Configured Bot Roles:**\n${formatRoles(autoRoleData.botRoles, guild)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Main action buttons - Row 1
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_add_role")
      .setLabel("Add Roles")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ar_remove_role")
      .setLabel("Remove Roles")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ar_view_config")
      .setLabel("View Config")
      .setStyle(ButtonStyle.Secondary)
  );

  // Utility buttons - Row 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_reset_settings")
      .setLabel("Reset Settings")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ar_test_system")
      .setLabel("Test System")
      .setStyle(ButtonStyle.Primary)
  );

  container.addActionRowComponents(row1);
  container.addActionRowComponents(row2);

  // Footer
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Last updated: ${new Date().toLocaleString()}`
    )
  );

  return container;
}

// Main interaction handler
async function handleMainInteraction(
  interaction,
  client,
  autoRoleData,
  mainMessage
) {
  const { customId } = interaction;

  switch (customId) {
    case "ar_add_role":
      await handleAddRole(interaction, client, autoRoleData);
      break;
    case "ar_remove_role":
      await handleRemoveRole(interaction, client, autoRoleData);
      break;
    case "ar_view_config":
      await handleViewConfig(interaction, client, autoRoleData);
      break;
    case "ar_reset_settings":
      await handleResetSettings(interaction, client, autoRoleData);
      break;
    case "ar_test_system":
      await handleTestSystem(interaction, client, autoRoleData);
      break;
    case "ar_back":
      await handleBack(interaction, client, autoRoleData);
      break;
    case "ar_add_humans":
      await showRoleSelector(interaction, client, "humans");
      break;
    case "ar_add_bots":
      await showRoleSelector(interaction, client, "bots");
      break;
    case "ar_remove_selected_roles":
      await handleRoleRemoval(interaction, client, autoRoleData);
      break;
    default:
      if (customId.startsWith("select_")) {
        await handleRoleSelection(interaction, client, autoRoleData);
      }
      break;
  }
}

// Add role handler
async function handleAddRole(interaction, client, autoRoleData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Add AutoRoles\n> Select the type of members you want to assign roles to"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Humans:** Assign roles to human members when they join\n> **Bots:** Assign roles to bot accounts when they are added`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const addRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_add_humans")
      .setLabel("Add Human Roles")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ar_add_bots")
      .setLabel("Add Bot Roles")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(addRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Remove role handler
async function handleRemoveRole(interaction, client, autoRoleData) {
  if (!autoRoleData.humanRoles?.length && !autoRoleData.botRoles?.length) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# No Roles Configured\n> There are no roles configured to remove."
      )
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ar_back")
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(backRow);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
    return;
  }

  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Remove AutoRoles\n> Select roles to remove from the auto-assignment system"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Create removal options
  const rolesToRemove = [
    ...(autoRoleData.humanRoles?.map((roleId) => {
      const role = interaction.guild.roles.cache.get(roleId);
      return {
        label: `Human: ${role ? role.name : "Unknown Role"}`,
        value: `human_${roleId}`,
      };
    }) || []),
    ...(autoRoleData.botRoles?.map((roleId) => {
      const role = interaction.guild.roles.cache.get(roleId);
      return {
        label: `Bot: ${role ? role.name : "Unknown Role"}`,
        value: `bot_${roleId}`,
      };
    }) || []),
  ];

  if (rolesToRemove.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ar_remove_selected_roles")
      .setPlaceholder("Select roles to remove")
      .setMinValues(1)
      .setMaxValues(Math.min(rolesToRemove.length, 25))
      .addOptions(rolesToRemove);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);
    container.addActionRowComponents(selectRow);
  }

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// View config handler
async function handleViewConfig(interaction, client, autoRoleData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Current AutoRole Configuration\n> Here is your server's current auto-role setup"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Human Roles (${autoRoleData.humanRoles?.length || 0}):**\n${formatRoles(autoRoleData.humanRoles, interaction.guild)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Bot Roles (${autoRoleData.botRoles?.length || 0}):**\n${formatRoles(autoRoleData.botRoles, interaction.guild)}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Reset settings handler
async function handleResetSettings(interaction, client, autoRoleData) {
  try {
    await AutoRole.findOneAndDelete({ guildId: interaction.guild.id });

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Settings Reset\n> AutoRole settings have been successfully reset to default."
      )
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ar_back")
        .setLabel("Back to Menu")
        .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(backRow);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });

    // Reset the data object
    autoRoleData.humanRoles = [];
    autoRoleData.botRoles = [];
  } catch (err) {
    console.error("Error while resetting settings:", err);
    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Error\n> An error occurred while resetting the settings. Please try again."
      )
    );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
    });
  }
}

// Test system handler
async function handleTestSystem(interaction, client, autoRoleData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# System Test\n> Testing AutoRole system functionality..."
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const hasHumanRoles = autoRoleData.humanRoles?.length > 0;
  const hasBotRoles = autoRoleData.botRoles?.length > 0;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Human Role Assignment:** ${hasHumanRoles ? "Configured" : "Not Configured"}\n` +
        `> **Bot Role Assignment:** ${hasBotRoles ? "Configured" : "Not Configured"}\n` +
        `> **Bot Permissions:** ${interaction.guild.members.me.permissions.has("ManageRoles") ? "Can Manage Roles" : "Missing Manage Roles Permission"}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Back to main handler
async function handleBack(interaction, client, autoRoleData) {
  // Refresh data from database
  const freshData =
    (await AutoRole.findOne({ guildId: interaction.guild.id })) || autoRoleData;
  const container = createMainContainer(freshData, interaction.guild, client);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Show role selector
async function showRoleSelector(interaction, client, type) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Select Roles for ${type === "humans" ? "Humans" : "Bots"}\n> Choose which roles should be automatically assigned to ${type} when they join the server`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "Use the dropdown menu below to select one or more roles"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const roleSelectMenu = new RoleSelectMenuBuilder()
    .setCustomId(`select_${type}`)
    .setPlaceholder(`Select roles for ${type}`)
    .setMinValues(1)
    .setMaxValues(25);

  const selectRow = new ActionRowBuilder().addComponents(roleSelectMenu);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_add_role")
      .setLabel("Back to Add Menu")
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Handle role selection
async function handleRoleSelection(interaction, client, autoRoleData) {
  const roleIds = interaction.values;
  const roleType = interaction.customId.startsWith("select_humans")
    ? "humanRoles"
    : "botRoles";
  const memberType = roleType === "humanRoles" ? "Humans" : "Bots";

  try {
    let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });
    if (!autoRole) {
      autoRole = new AutoRole({ guildId: interaction.guild.id });
    }

    const addedRoles = [];
    roleIds.forEach((roleId) => {
      if (!autoRole[roleType].includes(roleId)) {
        autoRole[roleType].push(roleId);
        addedRoles.push(roleId);
      }
    });

    await autoRole.save();

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Roles Added Successfully\n> Successfully added ${addedRoles.length} role(s) for ${memberType}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Added Roles:** ${addedRoles.map((roleId) => `<@&${roleId}>`).join(", ")}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ar_add_role")
        .setLabel("Add More Roles")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("ar_back")
        .setLabel("Back to Main")
        .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(actionRow);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });

    // Update the autoRoleData object
    Object.assign(autoRoleData, autoRole.toObject());
  } catch (err) {
    console.error(err);
    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Error\n> An error occurred while adding the roles."
      )
    );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
    });
  }
}

// Handle role removal
async function handleRoleRemoval(interaction, client, autoRoleData) {
  const roleIds = interaction.values;

  try {
    const autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });
    if (!autoRole) {
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# No Configuration Found\n> No roles are configured to remove."
        )
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [errorContainer],
      });
      return;
    }

    const removedRoles = [];

    roleIds.forEach((roleValue) => {
      const [type, roleId] = roleValue.split("_");
      const roleArray = type === "human" ? "humanRoles" : "botRoles";

      if (autoRole[roleArray].includes(roleId)) {
        autoRole[roleArray] = autoRole[roleArray].filter((id) => id !== roleId);
        removedRoles.push(roleId);
      }
    });

    await autoRole.save();

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Roles Removed Successfully\n> Successfully removed ${removedRoles.length} role(s) from the auto-assignment system`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Removed Roles:** ${removedRoles.map((roleId) => `<@&${roleId}>`).join(", ")}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ar_remove_role")
        .setLabel("Remove More Roles")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("ar_back")
        .setLabel("Back to Main")
        .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(actionRow);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });

    // Update the autoRoleData object
    Object.assign(autoRoleData, autoRole.toObject());
  } catch (err) {
    console.error(err);
    const errorContainer = new ContainerBuilder();
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# Error\n> An error occurred while removing the roles. Please try again."
      )
    );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [errorContainer],
    });
  }
}

// Helper functions
function createDisabledContainer(reason, client) {
  const container = new ContainerBuilder();
  const reasonText = reason === "time" ? "Session Expired" : "Session Ended";

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${reasonText}**\nThis interface has been disabled.`
    )
  );

  const disabledButton = new ButtonBuilder()
    .setCustomId("disabled")
    .setLabel(reasonText)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(disabledButton);
  container.addActionRowComponents(row);

  return container;
}

function formatRoles(roleIds, guild) {
  if (!roleIds || roleIds.length === 0) return "> None";

  const formattedRoles = roleIds
    .slice(0, 10)
    .map((roleId) => {
      const role = guild.roles.cache.get(roleId);
      return role ? `${role.name}\n` : `\`Unknown Role (${roleId})\``;
    })
    .join("> ");

  return roleIds.length > 10
    ? `> ${formattedRoles}\n> *...and ${roleIds.length - 10} more*`
    : `> ${formattedRoles}`;
}
