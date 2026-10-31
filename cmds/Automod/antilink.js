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
  ComponentType,
  PermissionsBitField,
  StringSelectMenuBuilder,
} = require("discord.js");
const AntiLink = require("@data/antilink");

module.exports = {
  name: "antilink",
  aliases: ["antil", "al"],
  description: "Advanced Anti-Link system with comprehensive management.",
  category: "Automod",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageGuild", "ManageMessages", "ViewChannel"],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;

      // Get or create antilink data with enhanced schema
      let antiLinkData = await AntiLink.findOne({ guildId });
      if (!antiLinkData) {
        antiLinkData = new AntiLink({
          guildId,
        });
        await antiLinkData.save();
      }

      // Create main interface
      const container = createMainContainer(
        antiLinkData,
        message.guild,
        client
      );

      const mainMessage = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      // Enhanced collector with better error handling
      const collector = mainMessage.createMessageComponentCollector({
        time: 300000, // 5 minutes
        filter: (i) => {
          if (i.user.id !== userId) {
            i.reply({
              content: `${getEmoji("error")} Only ${message.author} can use this interface.`,
              ephemeral: true,
            }).catch(() => {});
            return false;
          }
          return true;
        },
      });

      // Sub-collectors for different component types
      const subCollectors = new Map();

      collector.on("collect", async (interaction) => {
        try {
          await handleMainInteraction(
            interaction,
            client,
            antiLinkData,
            mainMessage,
            subCollectors
          );
        } catch (error) {
          console.error("Interaction error:", error);
          const errorContainer = new ContainerBuilder();
          errorContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${getEmoji("error")} **Error**\nAn error occurred while processing your request.`
            )
          );

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              flags: MessageFlags.IsComponentsV2,
              components: [errorContainer],
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [errorContainer],
              ephemeral: true,
            });
          }
        }
      });

      // Enhanced cleanup
      collector.on("end", async (collected, reason) => {
        // Stop all sub-collectors
        subCollectors.forEach((subCollector) => {
          if (subCollector && !subCollector.ended) {
            subCollector.stop();
          }
        });
        subCollectors.clear();

        // Update message with disabled components
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
          `AntiLink interface ended: ${reason} (${collected.size} interactions)`
        );
      });
    } catch (error) {
      console.error("AntiLink command error:", error);
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${getEmoji("error")} **System Error**\nFailed to initialize the Anti-Link system.`
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

function createMainContainer(antiLinkData, guild, client) {
  const container = new ContainerBuilder();
  const statusColor = antiLinkData.isEnabled ? "#00FF00" : "#FF0000";
  const statusText = antiLinkData.isEnabled
    ? client.emoji.tick
    : client.emoji.cross;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# **Anti-Link System - ${client.user.username}**\nComprehensive link protection for your server`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **System Status:** ${statusText}`)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Whitelisted Users:** ${
        antiLinkData.whitelistUsers ? antiLinkData.whitelistUsers.length : 0
      } | **Whitelisted Roles:** ${
        antiLinkData.whitelistRoles ? antiLinkData.whitelistRoles.length : 0
      } | **Whitelisted Channels:** ${
        antiLinkData.whitelistChannels
          ? antiLinkData.whitelistChannels.length
          : 0
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Action and punishment section
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Current Action:** ${getActionDisplay(antiLinkData.action || "delete")}`
    )
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Punishment:** ${getPunishmentDisplay(antiLinkData.punishment || "none")}`
    )
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Log Channel:** ${
        antiLinkData.logChannel ? `<#${antiLinkData.logChannel}>` : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Main action buttons - Row 1
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_toggle")
      .setLabel("Toggle System")
      .setStyle(
        antiLinkData?.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success
      ),
    new ButtonBuilder()
      .setCustomId("al_whitelist")
      .setLabel("Manage Whitelist")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("al_settings")
      .setLabel("Action Settings")
      .setStyle(ButtonStyle.Secondary)
  );

  // Main action buttons - Row 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_channels")
      .setLabel("Channel Whitelist") // Updated label
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("al_domains")
      .setLabel("Allowed Domains")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("al_logs")
      .setLabel("Log Settings")
      .setStyle(ButtonStyle.Secondary)
  );

  // Utility buttons - Row 3
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_test")
      .setLabel("Test System")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("al_stats")
      .setLabel("Statistics")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("al_export")
      .setLabel("Export Config")
      .setStyle(ButtonStyle.Primary)
  );

  container.addActionRowComponents(row1);
  container.addActionRowComponents(row2);
  // container.addActionRowComponents(row3);

  // Footer
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Last updated: ${antiLinkData.updatedAt?.toLocaleString() || "Never"}`
    )
  );

  return container;
}

// Main interaction handler
async function handleMainInteraction(
  interaction,
  client,
  antiLinkData,
  mainMessage,
  subCollectors
) {
  const { customId } = interaction;

  switch (customId) {
    case "al_toggle":
      await handleToggle(interaction, client, antiLinkData);
      break;
    case "al_whitelist":
      await handleWhitelist(
        interaction,
        client,
        antiLinkData,
        mainMessage,
        subCollectors
      );
      break;
    case "al_settings":
      await handleSettings(interaction, client, antiLinkData);
      break;
    case "al_channels":
      // Call the new channel whitelist handler
      await handleChannelWhitelist(
        interaction,
        client,
        antiLinkData,
        mainMessage,
        subCollectors
      );
      break;
    case "al_domains":
      await handleDomains(interaction, client, antiLinkData);
      break;
    case "al_logs":
      await handleLogs(
        interaction,
        client,
        antiLinkData,
        mainMessage,
        subCollectors
      );
      break;
    case "al_test":
      await handleTest(interaction, client, antiLinkData);
      break;
    case "al_stats":
      await handleStats(interaction, client, antiLinkData);
      break;
    case "al_export":
      await handleExport(interaction, client, antiLinkData);
      break;
    case "al_back":
      await handleBack(interaction, client, antiLinkData);
      break;
    case "action_select":
      await handleActionSelect(interaction, antiLinkData, client);
      break;
    case "punishment_select":
      await handlePunishmentSelect(interaction, antiLinkData, client);
      break;
    case "log_channel_select":
      await handleLogChannelSelect(interaction, antiLinkData, client);
      break;
    default:
      // Handle sub-component interactions
      await handleSubComponentInteraction(
        interaction,
        client,
        antiLinkData,
        customId,
        subCollectors
      );
      break;
  }
}

// Toggle system handler
async function handleToggle(interaction, client, antiLinkData) {
  antiLinkData.isEnabled = !antiLinkData.isEnabled;
  antiLinkData.updatedAt = new Date();

  await antiLinkData.save();

  const container = createMainContainer(
    antiLinkData,
    interaction.guild,
    client
  );

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });

  console.log(
    `AntiLink ${antiLinkData.isEnabled ? "enabled" : "disabled"} in ${interaction.guild.name} by ${interaction.user.tag}`
  );
}

// Whitelist management handler
async function handleWhitelist(
  interaction,
  client,
  antiLinkData,
  mainMessage,
  subCollectors
) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Whitelist Management\n> Manage users, roles, and channels that can bypass the anti-link system"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Users:**\n> - ${
        antiLinkData.whitelistUsers?.length
          ? formatWhitelistItems(antiLinkData.whitelistUsers, "user")
          : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Roles:**\n> - ${
        antiLinkData.whitelistRoles?.length
          ? formatWhitelistItems(antiLinkData.whitelistRoles, "role")
          : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Channels:**\n> - ${
        antiLinkData.whitelistChannels?.length
          ? formatWhitelistItems(antiLinkData.whitelistChannels, "channel")
          : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const actionRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_add_users")
      .setLabel("Add Users")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("wl_add_roles")
      .setLabel("Add Roles")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("wl_add_channels")
      .setLabel("Add Channels")
      .setStyle(ButtonStyle.Secondary)
  );

  const actionRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_remove")
      .setLabel("Remove Items")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow1);
  container.addActionRowComponents(actionRow2);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });

  // Setup selection collectors
  setupWhitelistCollectors(
    mainMessage,
    subCollectors,
    antiLinkData,
    interaction.user.id
  );
}

// Setup whitelist collectors
function setupWhitelistCollectors(
  mainMessage,
  subCollectors,
  antiLinkData,
  userId,
  client
) {
  // Clear existing collectors
  subCollectors.forEach((collector) => {
    if (collector && !collector.ended) collector.stop();
  });
  subCollectors.clear();

  // User selector collector
  const userCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.UserSelect,
    time: 180000,
    filter: (i) => i.user.id === userId,
  });

  userCollector.on("collect", async (i) => {
    try {
      await handleUserSelection(i, antiLinkData, client);
    } catch (error) {
      console.error("User selection error:", error);
    }
  });

  // Role selector collector
  const roleCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.RoleSelect,
    time: 180000,
    filter: (i) => i.user.id === userId,
  });

  roleCollector.on("collect", async (i) => {
    try {
      await handleRoleSelection(i, antiLinkData, client);
    } catch (error) {
      console.error("Role selection error:", error);
    }
  });

  // Channel selector collector
  const channelCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.ChannelSelect,
    time: 180000,
    filter: (i) => i.user.id === userId,
  });

  channelCollector.on("collect", async (i) => {
    try {
      await handleChannelSelection(i, antiLinkData, client);
    } catch (error) {
      console.error("Channel selection error:", error);
    }
  });

  // Removal selector collectors
  const removalCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 180000,
    filter: (i) => i.user.id === userId && i.customId.startsWith("remove_"),
  });

  removalCollector.on("collect", async (i) => {
    try {
      await handleRemovalSelection(i, antiLinkData, client);
    } catch (error) {
      console.error("Removal selection error:", error);
    }
  });

  subCollectors.set("user", userCollector);
  subCollectors.set("role", roleCollector);
  subCollectors.set("channel", channelCollector);
  subCollectors.set("removal", removalCollector);
}

// Channel selection handler
async function handleChannelSelection(interaction, antiLinkData, client) {
  if (interaction.customId === "select_channels") {
    const selectedChannels = interaction.values;
    const addedChannels = [];

    antiLinkData.whitelistChannels = antiLinkData.whitelistChannels || [];

    for (const channelId of selectedChannels) {
      if (!antiLinkData.whitelistChannels.includes(channelId)) {
        antiLinkData.whitelistChannels.push(channelId);
        addedChannels.push(channelId);
      }
    }

    if (addedChannels.length > 0) {
      antiLinkData.updatedAt = new Date();
      await antiLinkData.save();

      await interaction.reply({
        content: ` Successfully added ${addedChannels.length} channel(s) to the whitelist!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `All selected channels are already in the whitelist.`,
        ephemeral: true,
      });
    }

    // Re-render the whitelist menu
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Whitelist Management\n> Manage users, roles, and channels that can bypass the anti-link system`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Users:**\n> - ${formatWhitelistItems(antiLinkData.whitelistUsers, "user")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Roles:**\n> - ${formatWhitelistItems(antiLinkData.whitelistRoles, "role")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Channels:**\n> - ${formatWhitelistItems(antiLinkData.whitelistChannels, "channel")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    const actionRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_add_users")
        .setLabel("Add Users")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_roles")
        .setLabel("Add Roles")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_channels")
        .setLabel("Add Channels")
        .setStyle(ButtonStyle.Secondary)
    );
    const actionRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_remove")
        .setLabel("Remove Items")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("al_back")
        .setEmoji(`1248902648132927551`)
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(actionRow1);
    container.addActionRowComponents(actionRow2);
    await interaction.message
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      })
      .catch(() => {});
  }
}

// User selection handler
async function handleUserSelection(interaction, antiLinkData, client) {
  if (interaction.customId === "select_users") {
    const selectedUsers = interaction.values;
    const addedUsers = [];

    antiLinkData.whitelistUsers = antiLinkData.whitelistUsers || [];

    for (const userId of selectedUsers) {
      if (!antiLinkData.whitelistUsers.includes(userId)) {
        antiLinkData.whitelistUsers.push(userId);
        addedUsers.push(userId);
      }
    }

    if (addedUsers.length > 0) {
      antiLinkData.updatedAt = new Date();
      await antiLinkData.save();

      await interaction.reply({
        content: ` Successfully added ${addedUsers.length} user(s) to the whitelist!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `All selected users are already in the whitelist.`,
        ephemeral: true,
      });
    }

    // Re-render the whitelist menu
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Whitelist Management\n> Manage users, roles, and channels that can bypass the anti-link system`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Users:**\n> - ${formatWhitelistItems(antiLinkData.whitelistUsers, "user")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Roles:**\n> - ${formatWhitelistItems(antiLinkData.whitelistRoles, "role")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Channels:**\n> - ${formatWhitelistItems(antiLinkData.whitelistChannels, "channel")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    const actionRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_add_users")
        .setLabel("Add Users")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_roles")
        .setLabel("Add Roles")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_channels")
        .setLabel("Add Channels")
        .setStyle(ButtonStyle.Secondary)
    );
    const actionRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_remove")
        .setLabel("Remove Items")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("al_back")
        .setEmoji(`1248902648132927551`)
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(actionRow1);
    container.addActionRowComponents(actionRow2);
    await interaction.message
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      })
      .catch(() => {});
  }
}

// Role selection handler
async function handleRoleSelection(interaction, antiLinkData, client) {
  if (interaction.customId === "select_roles") {
    const selectedRoles = interaction.values;
    const addedRoles = [];

    antiLinkData.whitelistRoles = antiLinkData.whitelistRoles || [];

    for (const roleId of selectedRoles) {
      if (!antiLinkData.whitelistRoles.includes(roleId)) {
        antiLinkData.whitelistRoles.push(roleId);
        addedRoles.push(roleId);
      }
    }

    if (addedRoles.length > 0) {
      antiLinkData.updatedAt = new Date();
      await antiLinkData.save();

      await interaction.reply({
        content: ` Successfully added ${addedRoles.length} role(s) to the whitelist!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `All selected roles are already in the whitelist.`,
        ephemeral: true,
      });
    }

    // Re-render the whitelist menu
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Whitelist Management\n> Manage users, roles, and channels that can bypass the anti-link system`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Users:**\n> - ${formatWhitelistItems(antiLinkData.whitelistUsers, "user")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Roles:**\n> - ${formatWhitelistItems(antiLinkData.whitelistRoles, "role")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Whitelisted Channels:**\n> - ${formatWhitelistItems(antiLinkData.whitelistChannels, "channel")}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    const actionRow1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_add_users")
        .setLabel("Add Users")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_roles")
        .setLabel("Add Roles")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("wl_add_channels")
        .setLabel("Add Channels")
        .setStyle(ButtonStyle.Secondary)
    );
    const actionRow2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("wl_remove")
        .setLabel("Remove Items")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("al_back")
        .setEmoji(`1248902648132927551`)
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(actionRow1);
    container.addActionRowComponents(actionRow2);
    await interaction.message
      .edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      })
      .catch(() => {});
  }
}

// Sub-component interaction handler
async function handleSubComponentInteraction(
  interaction,
  client,
  antiLinkData,
  customId,
  subCollectors
) {
  switch (customId) {
    case "wl_add_users":
      await showUserSelector(interaction, client);
      break;
    case "wl_add_roles":
      await showRoleSelector(interaction, client);
      break;
    case "wl_add_channels":
      // Call the new channel selector function
      await showChannelSelector(interaction, client);
      break;
    case "wl_remove":
      await showRemovalInterface(interaction, client, antiLinkData);
      break;
    case "remove_users":
    case "remove_roles":
    case "remove_channels":
      await handleRemovalSelection(interaction, antiLinkData);
      break;
  }
}

// Show channel selector
async function showChannelSelector(interaction, client) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Add Channels to Whitelist**\nSelect channels where anti-link system should be bypassed"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("select_channels")
    .setPlaceholder("Select channels to add to whitelist")
    .setMinValues(1)
    .setMaxValues(25);

  const selectRow = new ActionRowBuilder().addComponents(channelSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_whitelist")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Show user selector
async function showUserSelector(interaction, client) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Add Users to Whitelist**\nSelect users who can bypass the anti-link system"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId("select_users")
    .setPlaceholder("Select users to add to whitelist")
    .setMinValues(1)
    .setMaxValues(25);

  const selectRow = new ActionRowBuilder().addComponents(userSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_whitelist")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Show role selector
async function showRoleSelector(interaction, client) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Add Roles to Whitelist**\nSelect roles whose members can bypass the anti-link system"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId("select_roles")
    .setPlaceholder("Select roles to add to whitelist")
    .setMinValues(1)
    .setMaxValues(25);

  const selectRow = new ActionRowBuilder().addComponents(roleSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_whitelist")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Settings handler
async function handleSettings(interaction, client, antiLinkData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Action Settings\n> Configure what happens when a link is detected"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `- **Current Action:** ${getActionDisplay(antiLinkData.action || "delete")}\n` +
        `- **Current Punishment:** ${getPunishmentDisplay(antiLinkData.punishment || "none")}\n` +
        `- **Max Strikes:** ${antiLinkData.maxStrikes || 3}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const actionSelect = new StringSelectMenuBuilder()
    .setCustomId("action_select")
    .setPlaceholder("Choose action on link detection")
    .addOptions([
      {
        label: "Delete Message",
        description: "Simply delete the message containing links",
        value: "delete",
        default: antiLinkData.action === "delete",
      },
      {
        label: "Delete & Warn",
        description: "Delete message and send a warning",
        value: "warn",
        default: antiLinkData.action === "warn",
      },
      {
        label: "Delete & Log",
        description: "Delete message and log the incident",
        value: "log",
        default: antiLinkData.action === "log",
      },
    ]);

  const punishmentSelect = new StringSelectMenuBuilder()
    .setCustomId("punishment_select")
    .setPlaceholder("Choose punishment after max strikes")
    .addOptions([
      {
        label: "No Punishment",
        description: "Only delete messages, no additional punishment",
        value: "none",
        default: antiLinkData.punishment === "none",
      },
      {
        label: "Timeout",
        description: "Timeout the user for repeated violations",
        value: "timeout",
        default: antiLinkData.punishment === "timeout",
      },
      {
        label: "Kick",
        description: "Kick the user from the server",
        value: "kick",
        default: antiLinkData.punishment === "kick",
      },
      {
        label: "Ban",
        description: "Ban the user from the server",
        value: "ban",
        default: antiLinkData.punishment === "ban",
      },
    ]);

  const actionRow = new ActionRowBuilder().addComponents(actionSelect);
  const punishmentRow = new ActionRowBuilder().addComponents(punishmentSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);
  container.addActionRowComponents(punishmentRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Back to main handler
async function handleBack(interaction, client, antiLinkData) {
  const container = createMainContainer(
    antiLinkData,
    interaction.guild,
    client
  );

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Handle action selection
async function handleActionSelect(interaction, antiLinkData, client) {
  antiLinkData.action = interaction.values[0];
  antiLinkData.updatedAt = new Date();
  await antiLinkData.save();

  const container = createMainContainer(
    antiLinkData,
    interaction.guild,
    client
  );

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Handle punishment selection
async function handlePunishmentSelect(interaction, antiLinkData, client) {
  antiLinkData.punishment = interaction.values[0];
  antiLinkData.updatedAt = new Date();
  await antiLinkData.save();

  const container = createMainContainer(
    antiLinkData,
    interaction.guild,
    client
  );

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Log channel selector handler
async function handleLogChannelSelect(interaction, antiLinkData, client) {
  antiLinkData.logChannel = interaction.values[0];
  antiLinkData.updatedAt = new Date();
  await antiLinkData.save();

  const container = createMainContainer(
    antiLinkData,
    interaction.guild,
    client
  );

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleChannelWhitelist(
  interaction,
  client,
  antiLinkData,
  mainMessage,
  subCollectors
) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Channel Whitelist\n> Manage channels where the anti-link system should be bypassed"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Channels:**\n> - ${
        antiLinkData.whitelistChannels?.length
          ? formatWhitelistItems(antiLinkData.whitelistChannels, "channel")
          : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_add_channels")
      .setLabel("Add Channels")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });

  // Setup a collector specifically for the add/remove actions
  setupChannelWhitelistCollectors(
    mainMessage,
    subCollectors,
    antiLinkData,
    interaction.user.id
  );
}

// Setup channel whitelist collectors
function setupChannelWhitelistCollectors(
  mainMessage,
  subCollectors,
  antiLinkData,
  userId
) {
  // Clear existing collectors to prevent conflicts
  subCollectors.forEach((collector) => {
    if (collector && !collector.ended) collector.stop();
  });
  subCollectors.clear();

  // Channel selector collector for adding channels
  const channelAddCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.ChannelSelect,
    time: 180000,
    filter: (i) => i.user.id === userId && i.customId === "select_channels_add",
  });

  channelAddCollector.on("collect", async (i) => {
    try {
      await handleChannelSelection(i, antiLinkData, mainMessage, userId);
    } catch (error) {
      console.error("Channel selection error:", error);
    }
  });

  // Channel selector collector for removing channels
  const channelRemoveCollector = mainMessage.createMessageComponentCollector({
    componentType: ComponentType.ChannelSelect,
    time: 180000,
    filter: (i) =>
      i.user.id === userId && i.customId === "select_channels_remove",
  });

  channelRemoveCollector.on("collect", async (i) => {
    try {
      await handleChannelRemoval(i, antiLinkData, mainMessage, userId);
    } catch (error) {
      console.error("Channel removal error:", error);
    }
  });

  subCollectors.set("channel_add", channelAddCollector);
  subCollectors.set("channel_remove", channelRemoveCollector);
}

async function handleDomains(interaction, client, antiLinkData) {
  await interaction.reply({
    content: "Domain management is not yet implemented.",
    ephemeral: true,
  });
}

async function handleLogs(interaction, client, antiLinkData) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Log Settings\n> Choose a channel to send anti-link logs to."
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `- **Current Log Channel:** ${
        antiLinkData.logChannel ? `<#${antiLinkData.logChannel}>` : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const logChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("log_channel_select")
    .setPlaceholder("Select a channel for logs")
    .setMinValues(1)
    .setMaxValues(1);

  const selectRow = new ActionRowBuilder().addComponents(logChannelSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(selectRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleTest(interaction, client, antiLinkData) {
  await interaction.reply({
    content: "System test is not yet implemented.",
    ephemeral: true,
  });
}

async function handleStats(interaction, client, antiLinkData) {
  await interaction.reply({
    content: "Statistics are not yet implemented.",
    ephemeral: true,
  });
}

async function handleExport(interaction, client, antiLinkData) {
  await interaction.reply({
    content: "Config export is not yet implemented.",
    ephemeral: true,
  });
}

// Show removal interface function
async function showRemovalInterface(interaction, client, antiLinkData) {
  // Create selectors for whitelisted users, roles, and channels
  const userOptions =
    antiLinkData.whitelistUsers?.map((id) => ({
      label:
        interaction.guild.members.cache.get(id)?.user.tag ||
        `Unknown User (${id})`,
      value: id,
    })) || [];

  const roleOptions =
    antiLinkData.whitelistRoles?.map((id) => ({
      label:
        interaction.guild.roles.cache.get(id)?.name || `Unknown Role (${id})`,
      value: id,
    })) || [];

  const channelOptions =
    antiLinkData.whitelistChannels?.map((id) => ({
      label:
        interaction.guild.channels.cache.get(id)?.name ||
        `Unknown Channel (${id})`,
      value: id,
    })) || [];

  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Remove from Whitelist**\nSelect users, roles, or channels to remove from the whitelist."
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  // Show current whitelist status
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Current Whitelist:**\n` +
        `Users: ${userOptions.length}\n` +
        `Roles: ${roleOptions.length}\n` +
        `Channels: ${channelOptions.length}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const userSelect = new UserSelectMenuBuilder()
    .setCustomId("remove_users")
    .setPlaceholder(
      userOptions.length > 0 ? "Select users to remove" : "No users to remove"
    )
    .setMinValues(0)
    .setMaxValues(userOptions.length > 0 ? Math.min(userOptions.length, 25) : 1)
    .setDisabled(userOptions.length === 0);

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId("remove_roles")
    .setPlaceholder(
      roleOptions.length > 0 ? "Select roles to remove" : "No roles to remove"
    )
    .setMinValues(0)
    .setMaxValues(roleOptions.length > 0 ? Math.min(roleOptions.length, 25) : 1)
    .setDisabled(roleOptions.length === 0);

  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId("remove_channels")
    .setPlaceholder(
      channelOptions.length > 0
        ? "Select channels to remove"
        : "No channels to remove"
    )
    .setMinValues(0)
    .setMaxValues(
      channelOptions.length > 0 ? Math.min(channelOptions.length, 25) : 1
    )
    .setDisabled(channelOptions.length === 0);

  const userRow = new ActionRowBuilder().addComponents(userSelect);
  const roleRow = new ActionRowBuilder().addComponents(roleSelect);
  const channelRow = new ActionRowBuilder().addComponents(channelSelect);
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("al_whitelist")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(userRow);
  container.addActionRowComponents(roleRow);
  container.addActionRowComponents(channelRow);
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

// Handler for removal selection
async function handleRemovalSelection(interaction, antiLinkData) {
  const { customId, values } = interaction;
  const removedItems = [];
  let field = "";

  if (customId === "remove_users") {
    antiLinkData.whitelistUsers =
      antiLinkData.whitelistUsers?.filter((id) => {
        if (values.includes(id)) {
          removedItems.push(id);
          return false;
        }
        return true;
      }) || [];
    field = "user(s)";
  } else if (customId === "remove_roles") {
    antiLinkData.whitelistRoles =
      antiLinkData.whitelistRoles?.filter((id) => {
        if (values.includes(id)) {
          removedItems.push(id);
          return false;
        }
        return true;
      }) || [];
    field = "role(s)";
  } else if (customId === "remove_channels") {
    antiLinkData.whitelistChannels =
      antiLinkData.whitelistChannels?.filter((id) => {
        if (values.includes(id)) {
          removedItems.push(id);
          return false;
        }
        return true;
      }) || [];
    field = "channel(s)";
  } else {
    return;
  }

  if (removedItems.length > 0) {
    antiLinkData.updatedAt = new Date();
    await antiLinkData.save();

    await interaction.reply({
      content: `Successfully removed ${removedItems.length} ${field} from the whitelist.`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `No ${field} were removed.`,
      ephemeral: true,
    });
  }
}

// ** NEW FUNCTION: handleChannelRemoval **
async function handleChannelRemoval(
  interaction,
  antiLinkData,
  mainMessage,
  userId
) {
  const removedChannels = interaction.values;
  const removedCount = removedChannels.length;

  if (removedCount === 0) {
    await interaction.reply({
      content: "No channels were selected for removal.",
      ephemeral: true,
    });
    return;
  }

  // Remove channels from the whitelist array
  antiLinkData.whitelistChannels = antiLinkData.whitelistChannels.filter(
    (id) => !removedChannels.includes(id)
  );

  antiLinkData.updatedAt = new Date();
  await antiLinkData.save();

  await interaction.reply({
    content: ` Successfully removed ${removedCount} channel(s) from the whitelist.`,
    ephemeral: true,
  });

  // Re-render the channel whitelist menu to show the updated list
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Channel Whitelist\n> Manage channels where the anti-link system should be bypassed"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Channels:**\n> - ${
        antiLinkData.whitelistChannels?.length
          ? formatWhitelistItems(antiLinkData.whitelistChannels, "channel")
          : "None"
      }`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_add_channels")
      .setLabel("Add Channels")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(interaction.client.emoji.left)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow);

  await interaction.message
    .edit({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    })
    .catch(() => {});
}

async function handleWhitelistUpdated(
  interaction,
  client,
  antiLinkData,
  mainMessage,
  subCollectors
) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "# Whitelist Management\n> Manage users, roles, and channels that can bypass the anti-link system"
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Users:**\n> - ${formatWhitelistItems(antiLinkData.whitelistUsers, "user")}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Roles:**\n> - ${formatWhitelistItems(antiLinkData.whitelistRoles, "role")}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Whitelisted Channels:**\n> - ${formatWhitelistItems(antiLinkData.whitelistChannels, "channel")}`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder());

  const actionRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_add_users")
      .setLabel("Add Users")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("wl_add_roles")
      .setLabel("Add Roles")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("wl_add_channels")
      .setLabel("Add Channels")
      .setStyle(ButtonStyle.Secondary)
  );

  const actionRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("wl_remove")
      .setLabel("Remove Items")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("al_back")
      .setEmoji(`1248902648132927551`)
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(actionRow1);
  container.addActionRowComponents(actionRow2);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });

  // Setup selection collectors
  setupWhitelistCollectors(
    mainMessage,
    subCollectors,
    antiLinkData,
    interaction.user.id
  );
}

// Format whitelist items helper function
function formatWhitelistItems(items, type) {
  if (!items || items.length === 0) return "None";
  const formatted = items
    .slice(0, 10)
    .map((id) => {
      if (type === "user") return `<@${id}>`;
      if (type === "role") return `<@&${id}>`;
      if (type === "channel") return `<#${id}>`;
      return id;
    })
    .join(", ");
  return items.length > 10
    ? `${formatted}\n*...and ${items.length - 10} more*`
    : formatted;
}

// Helper functions
function createDisabledContainer(reason, client) {
  const container = new ContainerBuilder();
  const reasonText = reason === "time" ? "Session Expired" : "Session Ended";

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${client.emoji.time}**${reasonText}**\nThis interface has been disabled.`
    )
  );

  const disabledButton = new ButtonBuilder()
    .setCustomId("disabled")
    .setLabel(reasonText)
    .setEmoji(client.emoji.time)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const row = new ActionRowBuilder().addComponents(disabledButton);
  container.addActionRowComponents(row);

  return container;
}

function getActionDisplay(action) {
  const actions = {
    delete: "Delete Message",
    warn: "Delete & Warn",
    log: "Delete & Log",
  };
  return actions[action] || "Delete Message";
}

function getPunishmentDisplay(punishment) {
  const punishments = {
    none: "No Punishment",
    timeout: "Timeout User",
    kick: "Kick User",
    ban: "Ban User",
  };
  return punishments[punishment] || "No Punishment";
}

function getEmoji(type) {
  const emojis = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  return emojis[type] || "❓";
}
