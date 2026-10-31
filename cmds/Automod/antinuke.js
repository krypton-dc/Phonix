const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  MessageFlags,
} = require("discord.js");
const AntiNuke = require("@data/antinuke");

module.exports = {
  name: "antinuke",
  aliases: ["antiwizz", "an", "security"],
  category: "Automod",
  description: "Complete antinuke management system for server protection",
  cooldown: 5,
  execute: async (message, args, client, prefix) => {
    const authorId = message.author.id;
    const guildId = message.guild.id;

    try {
      let antinukeConfig = await AntiNuke.findOne({ guildId });
      if (!antinukeConfig) {
        antinukeConfig = new AntiNuke({
          guildId,
          isEnabled: false,
          whitelistUsers: [],
          whitelistRoles: [],
          extraOwners: [],
          logChannelId: null,
        });
        await antinukeConfig.save();
      }

      const isAuthorized =
        authorId === message.guild.ownerId ||
        authorId === client.owner ||
        (antinukeConfig.extraOwners || []).includes(authorId);

      if (!isAuthorized) {
        const errorContainer = new ContainerBuilder();
        errorContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${client.emoji.cross} | Only the **server owner** or an **extra owner** can use this command.`
          )
        );

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [errorContainer],
        });
      }

      /**
       * Helpers
       */
      const createBackButton = () =>
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("back_to_main")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary)
        );

      const buildMainMenu = (config) => {
        const container = new ContainerBuilder();
        const statusEmoji = config.isEnabled
          ? client.emoji.tick
          : client.emoji.cross;
        const statusText = config.isEnabled ? "**ENABLED**" : "**DISABLED**";

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent("🛡️ **Antinuke Security System**")
        );

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Current Status:** ${statusEmoji} ${statusText}\n\n` +
              `**Protected Actions:**\n` +
              `${client.emoji.dot} Anti Ban/Kick/Unban\n` +
              `${client.emoji.dot} Anti Role Management\n` +
              `${client.emoji.dot} Anti Channel Management\n` +
              `${client.emoji.dot} Anti Webhook Management\n` +
              `${client.emoji.dot} Anti Server Updates\n` +
              `${client.emoji.dot} Anti Bot Addition\n` +
              `${client.emoji.dot} Anti Vanity Stealing`
          )
        );

        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Statistics:**\n` +
              `${client.emoji.dot} Whitelisted Users: \`${(config.whitelistUsers || []).length}\`\n` +
              `${client.emoji.dot} Whitelisted Roles: \`${(config.whitelistRoles || []).length}\`\n` +
              `${client.emoji.dot} Extra Owners: \`${(config.extraOwners || []).length}/3\``
          )
        );

        if (client.config?.links?.icon) {
          container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems([
              { media: { url: client.icon } },
            ])
          );
        }

        container.addSeparatorComponents(new SeparatorBuilder());

        const toggleButton = new ButtonBuilder()
          .setCustomId("toggle_antinuke")
          .setLabel(config.isEnabled ? "Disable" : "Enable")
          .setStyle(
            config.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success
          );

        const whitelistButton = new ButtonBuilder()
          .setCustomId("manage_whitelist")
          .setLabel("Whitelist")
          .setStyle(ButtonStyle.Secondary);

        const ownersButton = new ButtonBuilder()
          .setCustomId("manage_owners")
          .setLabel("Extra Owners")
          .setStyle(ButtonStyle.Secondary);

        const mainRow = new ActionRowBuilder().addComponents(
          toggleButton,
          whitelistButton,
          ownersButton
        );

        const configButton = new ButtonBuilder()
          .setCustomId("view_config")
          .setLabel("View Config")
          .setStyle(ButtonStyle.Secondary);

        const logsButton = new ButtonBuilder()
          .setCustomId("manage_logs")
          .setLabel("Logs")
          .setStyle(ButtonStyle.Secondary);

        const secondaryRow = new ActionRowBuilder().addComponents(
          configButton,
          logsButton
        );

        container.addActionRowComponents(mainRow, secondaryRow);
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# Select an option above to manage your server security.`
          )
        );

        return container;
      };

      // Send main menu
      const mainMessage = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildMainMenu(antinukeConfig)],
      });

      /**
       * UNIFIED Collector for all message components
       * This is the main fix to handle both buttons and select menus.
       */
      const collector = mainMessage.createMessageComponentCollector({
        time: 300000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({
            content: "This menu is not for you!",
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          await interaction.deferUpdate();
          antinukeConfig = await AntiNuke.findOne({ guildId });

          if (interaction.isButton()) {
            switch (interaction.customId) {
              case "back_to_main": {
                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [buildMainMenu(antinukeConfig)],
                });
                break;
              }
              case "toggle_antinuke": {
                if (antinukeConfig.isEnabled) {
                  antinukeConfig.isEnabled = false;
                  await antinukeConfig.save();

                  const disableContainer = new ContainerBuilder();
                  disableContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Antinuke Disabled**")
                  );
                  disableContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `**${message.guild.name}** security system has been **disabled**.\n\n` +
                        `${client.emoji.tick} All protection modules are now inactive\n` +
                        `${client.emoji.tick} Whitelist and settings preserved\n\n` +
                        `Use the enable button to reactivate protection.`
                    )
                  );
                  disableContainer.addActionRowComponents(createBackButton());

                  await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [disableContainer],
                  });
                } else {
                  const events = [
                    "Anti Ban Protection",
                    "Anti Kick Protection",
                    "Anti Unban Protection",
                    "Anti Role Management",
                    "Anti Channel Management",
                    "Anti Webhook Protection",
                    "Anti Sticker Management",
                    "Anti Everyone/Here Mentions",
                    "Anti Server Updates",
                    "Anti Bot Addition",
                    "Anti Vanity Stealing",
                  ];

                  for (let i = 0; i < events.length; i++) {
                    const loadingContainer = new ContainerBuilder();
                    loadingContainer.addTextDisplayComponents(
                      new TextDisplayBuilder().setContent(
                        "**Initializing Antinuke System**"
                      )
                    );
                    loadingContainer.addTextDisplayComponents(
                      new TextDisplayBuilder().setContent(
                        `${client.emoji.loading} Setting up security protocols...\n\n` +
                          `**Loading Modules:**\n` +
                          events
                            .slice(0, i + 1)
                            .map((event) => `${client.emoji.tick} ${event}`)
                            .join("\n") +
                          (i < events.length - 1
                            ? `\n${client.emoji.loading} ${events[i + 1]}...`
                            : "")
                      )
                    );

                    await interaction.editReply({
                      flags: MessageFlags.IsComponentsV2,
                      components: [loadingContainer],
                    });

                    await new Promise((resolve) => setTimeout(resolve, 400));
                  }

                  let logChannel;
                  if (antinukeConfig.logChannelId) {
                    logChannel = message.guild.channels.cache.get(
                      antinukeConfig.logChannelId
                    );
                  }

                  if (!logChannel) {
                    logChannel = await message.guild.channels.create({
                      name: `${client.user.username}-security-logs`,
                      type: ChannelType.GuildText,
                      permissionOverwrites: [
                        {
                          id: message.guild.id,
                          type: 0,
                          deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                          id: message.guild.ownerId,
                          type: 1,
                          allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                          id: client.user.id,
                          type: 1,
                          allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                      ],
                      reason: "Antinuke Security Logs Channel",
                    });

                    antinukeConfig.logChannelId = logChannel.id;
                  }

                  antinukeConfig.isEnabled = true;
                  await antinukeConfig.save();

                  const enableContainer = new ContainerBuilder();
                  enableContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      "**Antinuke System Activated**"
                    )
                  );
                  enableContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `**${message.guild.name}** is now fully protected!\n\n` +
                        `${client.emoji.tick} All security modules active\n` +
                        `${client.emoji.tick} Logging channel: <#${logChannel.id}>\n` +
                        `${client.emoji.tick} Whitelist: \`${antinukeConfig.whitelistUsers.length}\` users, \`${antinukeConfig.whitelistRoles.length}\` roles`
                    )
                  );
                  enableContainer.addSeparatorComponents(
                    new SeparatorBuilder()
                  );
                  enableContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `**⚠️ Important:** Move my role to the top of the role hierarchy for optimal protection.`
                    )
                  );
                  enableContainer.addActionRowComponents(createBackButton());

                  await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [enableContainer],
                  });
                }
                break;
              }
              case "manage_whitelist": {
                const whitelistContainer = new ContainerBuilder();
                whitelistContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "📋 **Whitelist Management**"
                  )
                );
                whitelistContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Manage users and roles that are exempt from antinuke actions.\n\n` +
                      `**Current Whitelist:**\n` +
                      `${client.emoji.dot} Users: \`${(antinukeConfig.whitelistUsers || []).length}\`\n` +
                      `${client.emoji.dot} Roles: \`${(antinukeConfig.whitelistRoles || []).length}\`\n\n` +
                      `Select what you want to manage:`
                  )
                );
                whitelistContainer.addSeparatorComponents(
                  new SeparatorBuilder()
                );

                const whitelistButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("add_users")
                    .setLabel("Add Users")
                    .setStyle(ButtonStyle.Secondary),
                  new ButtonBuilder()
                    .setCustomId("add_roles")
                    .setLabel("Add Roles")
                    .setStyle(ButtonStyle.Secondary),
                  new ButtonBuilder()
                    .setCustomId("view_whitelist")
                    .setLabel("View List")
                    .setStyle(ButtonStyle.Secondary)
                );

                const clearResetButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("clear_whitelist")
                    .setLabel("Clear All")
                    .setStyle(ButtonStyle.Danger),
                  new ButtonBuilder()
                    .setCustomId("back_to_main")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                );

                whitelistContainer.addActionRowComponents(
                  whitelistButtons,
                  clearResetButtons
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [whitelistContainer],
                });
                break;
              }
              case "add_users": {
                const userContainer = new ContainerBuilder();
                userContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "👤 **Add Users to Whitelist**"
                  )
                );
                userContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Select users who should be exempt from antinuke actions."
                  )
                );

                const userSelectMenu = new UserSelectMenuBuilder()
                  .setCustomId("select_users")
                  .setPlaceholder("Select users to whitelist (max 25)")
                  .setMinValues(1)
                  .setMaxValues(25);

                const userSelectRow = new ActionRowBuilder().addComponents(
                  userSelectMenu
                );
                userContainer.addActionRowComponents(
                  userSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [userContainer],
                });
                break;
              }
              case "add_roles": {
                const roleContainer = new ContainerBuilder();
                roleContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "🏷️ **Add Roles to Whitelist**"
                  )
                );
                roleContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Select roles whose members should be exempt from antinuke actions."
                  )
                );

                const roleSelectMenu = new RoleSelectMenuBuilder()
                  .setCustomId("select_roles")
                  .setPlaceholder("Select roles to whitelist (max 25)")
                  .setMinValues(1)
                  .setMaxValues(25);

                const roleSelectRow = new ActionRowBuilder().addComponents(
                  roleSelectMenu
                );
                roleContainer.addActionRowComponents(
                  roleSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [roleContainer],
                });
                break;
              }
              case "remove_users": {
                const removeUsersContainer = new ContainerBuilder();
                removeUsersContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "🗑️ **Remove Users from Whitelist**"
                  )
                );
                removeUsersContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Select users to remove from the whitelist."
                  )
                );

                const usersToRemove =
                  antinukeConfig.whitelistUsers.length > 0
                    ? new UserSelectMenuBuilder()
                        .setCustomId("remove_users_select")
                        .setPlaceholder("Select users to remove")
                        .setMinValues(1)
                        .setMaxValues(antinukeConfig.whitelistUsers.length)
                    : new UserSelectMenuBuilder()
                        .setCustomId("remove_users_select")
                        .setPlaceholder("No users to remove")
                        .setDisabled(true);

                const userSelectRow = new ActionRowBuilder().addComponents(
                  usersToRemove
                );
                removeUsersContainer.addActionRowComponents(
                  userSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [removeUsersContainer],
                });
                break;
              }
              case "remove_roles": {
                const removeRolesContainer = new ContainerBuilder();
                removeRolesContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "🗑️ **Remove Roles from Whitelist**"
                  )
                );
                removeRolesContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Select roles to remove from the whitelist."
                  )
                );

                const rolesToRemove =
                  antinukeConfig.whitelistRoles.length > 0
                    ? new RoleSelectMenuBuilder()
                        .setCustomId("remove_roles_select")
                        .setPlaceholder("Select roles to remove")
                        .setMinValues(1)
                        .setMaxValues(antinukeConfig.whitelistRoles.length)
                    : new RoleSelectMenuBuilder()
                        .setCustomId("remove_roles_select")
                        .setPlaceholder("No roles to remove")
                        .setDisabled(true);

                const roleSelectRow = new ActionRowBuilder().addComponents(
                  rolesToRemove
                );
                removeRolesContainer.addActionRowComponents(
                  roleSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [removeRolesContainer],
                });
                break;
              }
              case "view_whitelist": {
                const viewContainer = new ContainerBuilder();
                viewContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "📄 **Current Whitelist**"
                  )
                );

                const usersList =
                  antinukeConfig.whitelistUsers.length > 0
                    ? antinukeConfig.whitelistUsers
                        .slice(0, 20)
                        .map((id) => `${client.emoji.dot} <@${id}>`)
                        .join("\n") +
                      (antinukeConfig.whitelistUsers.length > 20
                        ? `\n*+${antinukeConfig.whitelistUsers.length - 20} more...*`
                        : "")
                    : "None";

                viewContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `**Whitelisted Users (${antinukeConfig.whitelistUsers.length}):**\n${usersList}`
                  )
                );

                viewContainer.addSeparatorComponents(new SeparatorBuilder());

                const rolesList =
                  antinukeConfig.whitelistRoles.length > 0
                    ? antinukeConfig.whitelistRoles
                        .slice(0, 20)
                        .map((id) => `${client.emoji.dot} <@&${id}>`)
                        .join("\n") +
                      (antinukeConfig.whitelistRoles.length > 20
                        ? `\n*+${antinukeConfig.whitelistRoles.length - 20} more...*`
                        : "")
                    : "None";

                viewContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `**Whitelisted Roles (${antinukeConfig.whitelistRoles.length}):**\n${rolesList}`
                  )
                );

                const viewButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("remove_users")
                    .setLabel("Remove Users")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(antinukeConfig.whitelistUsers.length === 0),
                  new ButtonBuilder()
                    .setCustomId("remove_roles")
                    .setLabel("Remove Roles")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(antinukeConfig.whitelistRoles.length === 0),
                  new ButtonBuilder()
                    .setCustomId("back_to_main")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                );

                viewContainer.addActionRowComponents(viewButtons);

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [viewContainer],
                });
                break;
              }
              case "clear_whitelist": {
                antinukeConfig.whitelistUsers = [];
                antinukeConfig.whitelistRoles = [];
                await antinukeConfig.save();

                const clearContainer = new ContainerBuilder();
                clearContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "🗑️ **Whitelist Cleared**"
                  )
                );
                clearContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "All users and roles have been removed from the whitelist."
                  )
                );
                clearContainer.addActionRowComponents(createBackButton());

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [clearContainer],
                });
                break;
              }
              case "manage_owners": {
                const isServerOwner =
                  message.author.id === message.guild.ownerId;

                if (!isServerOwner) {
                  const noPermContainer = new ContainerBuilder();
                  noPermContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Access Denied**")
                  );
                  noPermContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      "Only the server owner can manage extra owners."
                    )
                  );
                  noPermContainer.addActionRowComponents(createBackButton());

                  await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [noPermContainer],
                  });
                  break;
                }

                const ownersContainer = new ContainerBuilder();
                ownersContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Extra Owners Management**"
                  )
                );
                ownersContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Extra owners have full access to the antinuke system.\n\n` +
                      `**Current Extra Owners (${antinukeConfig.extraOwners.length}/3):**\n` +
                      (antinukeConfig.extraOwners.length > 0
                        ? antinukeConfig.extraOwners
                            .map((id) => `${client.emoji.dot} <@${id}>`)
                            .join("\n")
                        : `${client.emoji.dot} None assigned`) +
                      `\n\n` +
                      `Select an action:`
                  )
                );

                const ownerButtons = new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId("add_extra_owner")
                    .setLabel("Add Owner")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(antinukeConfig.extraOwners.length >= 3),
                  new ButtonBuilder()
                    .setCustomId("remove_extra_owner")
                    .setLabel("Remove Owner")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(antinukeConfig.extraOwners.length === 0),
                  new ButtonBuilder()
                    .setCustomId("back_to_main")
                    .setLabel("Back")
                    .setStyle(ButtonStyle.Secondary)
                );

                ownersContainer.addActionRowComponents(ownerButtons);

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [ownersContainer],
                });
                break;
              }
              case "add_extra_owner": {
                const ownerContainer = new ContainerBuilder();
                ownerContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "👑 **Select Extra Owner**"
                  )
                );
                ownerContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Choose a user to grant extra owner permissions."
                  )
                );

                const ownerSelectMenu = new UserSelectMenuBuilder()
                  .setCustomId("select_extra_owner")
                  .setPlaceholder("Select a user to make extra owner")
                  .setMinValues(1)
                  .setMaxValues(1);

                const ownerSelectRow = new ActionRowBuilder().addComponents(
                  ownerSelectMenu
                );
                ownerContainer.addActionRowComponents(
                  ownerSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [ownerContainer],
                });
                break;
              }
              case "remove_extra_owner": {
                const ownerContainer = new ContainerBuilder();
                ownerContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "❌ **Remove Extra Owner**"
                  )
                );
                ownerContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "Select a user to remove from the extra owners list."
                  )
                );

                const ownerSelectMenu = new UserSelectMenuBuilder()
                  .setCustomId("remove_extra_owner_select")
                  .setPlaceholder("Select a user to remove")
                  .setMinValues(1)
                  .setMaxValues(antinukeConfig.extraOwners.length);

                ownerSelectMenu.setDisabled(
                  antinukeConfig.extraOwners.length === 0
                );

                const ownerSelectRow = new ActionRowBuilder().addComponents(
                  ownerSelectMenu
                );
                ownerContainer.addActionRowComponents(
                  ownerSelectRow,
                  createBackButton()
                );

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [ownerContainer],
                });
                break;
              }
              case "view_config": {
                const logChannel = antinukeConfig.logChannelId
                  ? message.guild.channels.cache.get(
                      antinukeConfig.logChannelId
                    )
                  : null;

                const configContainer = new ContainerBuilder();
                configContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Anti-nuke System - ${client.user.username}\nPlease select an option below to manage your server security.`
                  )
                );
                configContainer.addSeparatorComponents(new SeparatorBuilder());
                configContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `> **System Status:** ${antinukeConfig.isEnabled ? `${client.emoji.tick} ENABLED` : `${client.emoji.cross} DISABLED`} `
                  )
                );
                configContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `> **Whitelisted Users:** ${(antinukeConfig.whitelistUsers || []).length} | **Whitelisted Roles:** ${(antinukeConfig.whitelistRoles || []).length} | **Whitelisted Channels:** ${(antinukeConfig.whitelistChannels || []).length}`
                  )
                );
                configContainer.addSeparatorComponents(new SeparatorBuilder());
                configContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(`> **Punishment:** Ban `)
                );
                configContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `> **Log Channel:** ${logChannel ? `<#${logChannel.id}>` : "None"}`
                  )
                );
                configContainer.addSeparatorComponents(new SeparatorBuilder());

                if (antinukeConfig.whitelistUsers.length > 0) {
                  const userPreview =
                    antinukeConfig.whitelistUsers
                      .slice(0, 5)
                      .map((id) => `<@${id}>`)
                      .join(", ") +
                    (antinukeConfig.whitelistUsers.length > 5
                      ? ` *+${antinukeConfig.whitelistUsers.length - 5} more...*`
                      : "");
                  configContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `**👤 Recent Whitelisted Users:**\n${userPreview}`
                    )
                  );
                }

                if (antinukeConfig.whitelistRoles.length > 0) {
                  const rolePreview =
                    antinukeConfig.whitelistRoles
                      .slice(0, 5)
                      .map((id) => `<@&${id}>`)
                      .join(", ") +
                    (antinukeConfig.whitelistRoles.length > 5
                      ? ` *+${antinukeConfig.whitelistRoles.length - 5} more...*`
                      : "");
                  configContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `**🏷️ Recent Whitelisted Roles:**\n${rolePreview}`
                    )
                  );
                }

                configContainer.addActionRowComponents(createBackButton());

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [configContainer],
                });
                break;
              }
            }
          } else if (
            interaction.isStringSelectMenu() ||
            interaction.isUserSelectMenu() ||
            interaction.isRoleSelectMenu()
          ) {
            switch (interaction.customId) {
              case "select_users": {
                const selectedUsers = interaction.values;
                antinukeConfig.whitelistUsers = [
                  ...new Set([
                    ...antinukeConfig.whitelistUsers,
                    ...selectedUsers,
                  ]),
                ];
                await antinukeConfig.save();

                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Users Added to Whitelist**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully whitelisted:\n${selectedUsers.map((id) => `${client.emoji.tick} <@${id}>`).join("\n")}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
              case "select_roles": {
                const selectedRoles = interaction.values;
                antinukeConfig.whitelistRoles = [
                  ...new Set([
                    ...antinukeConfig.whitelistRoles,
                    ...selectedRoles,
                  ]),
                ];
                await antinukeConfig.save();
                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Roles Added to Whitelist**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully whitelisted:\n${selectedRoles.map((id) => `${client.emoji.tick} <@&${id}>`).join("\n")}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());
                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
              case "remove_users_select": {
                const selectedUsers = interaction.values;
                antinukeConfig.whitelistUsers =
                  antinukeConfig.whitelistUsers.filter(
                    (id) => !selectedUsers.includes(id)
                  );
                await antinukeConfig.save();

                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Users Removed from Whitelist**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully removed:\n${selectedUsers.map((id) => `${client.emoji.tick} <@${id}>`).join("\n")}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());
                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
              case "remove_roles_select": {
                const selectedRoles = interaction.values;
                antinukeConfig.whitelistRoles =
                  antinukeConfig.whitelistRoles.filter(
                    (id) => !selectedRoles.includes(id)
                  );
                await antinukeConfig.save();

                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Roles Removed from Whitelist**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully removed:\n${selectedRoles.map((id) => `${client.emoji.tick} <@&${id}>`).join("\n")}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());
                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
              case "select_extra_owner": {
                const selectedUser = interaction.values[0];
                if (selectedUser === message.guild.ownerId) {
                  const ownerErrorContainer = new ContainerBuilder();
                  ownerErrorContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      "❌ **Cannot Add Server Owner**"
                    )
                  );
                  ownerErrorContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `The server owner (<@${selectedUser}>) already has full permissions and cannot be added as an extra owner.`
                    )
                  );
                  ownerErrorContainer.addActionRowComponents(
                    createBackButton()
                  );
                  await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [ownerErrorContainer],
                  });
                  return;
                }

                if (antinukeConfig.extraOwners.includes(selectedUser)) {
                  const alreadyOwnerContainer = new ContainerBuilder();
                  alreadyOwnerContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      "⚠️ **User Already an Extra Owner**"
                    )
                  );
                  alreadyOwnerContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `<@${selectedUser}> is already on the extra owners list.`
                    )
                  );
                  alreadyOwnerContainer.addActionRowComponents(
                    createBackButton()
                  );
                  await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [alreadyOwnerContainer],
                  });
                  return;
                }

                antinukeConfig.extraOwners.push(selectedUser);
                await antinukeConfig.save();

                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Extra Owner Added**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully added <@${selectedUser}> as an extra owner. They now have full control over the antinuke system.`
                  )
                );

                const updatedOwnersList =
                  antinukeConfig.extraOwners.length > 0
                    ? antinukeConfig.extraOwners
                        .map((id) => `${client.emoji.dot} <@${id}>`)
                        .join("\n")
                    : "None assigned";

                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `\n**Current Extra Owners (${antinukeConfig.extraOwners.length}/3):**\n${updatedOwnersList}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
              case "remove_extra_owner_select": {
                const selectedUser = interaction.values[0];
                antinukeConfig.extraOwners = antinukeConfig.extraOwners.filter(
                  (id) => id !== selectedUser
                );
                await antinukeConfig.save();

                const successContainer = new ContainerBuilder();
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    "**Extra Owner Removed**"
                  )
                );
                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `Successfully removed <@${selectedUser}> from the extra owners list.`
                  )
                );

                const updatedOwnersList =
                  antinukeConfig.extraOwners.length > 0
                    ? antinukeConfig.extraOwners
                        .map((id) => `${client.emoji.dot} <@${id}>`)
                        .join("\n")
                    : "None assigned";

                successContainer.addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `\n**Current Extra Owners (${antinukeConfig.extraOwners.length}/3):**\n${updatedOwnersList}`
                  )
                );
                successContainer.addActionRowComponents(createBackButton());

                await interaction.editReply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [successContainer],
                });
                break;
              }
            }
          }
        } catch (err) {
          console.error("Interaction error:", err);
          return interaction.followUp({
            content: "❌ An error occurred while processing your request.",
            flags: MessageFlags.Ephemeral,
          });
        }
      });

      // Handle collector end
      collector.on("end", async () => {
        try {
          const expiredContainer = new ContainerBuilder();
          expiredContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("⏰ **Menu Expired**")
          );
          expiredContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "This antinuke menu has expired. Please run the command again."
            )
          );
          await mainMessage
            .edit({
              flags: MessageFlags.IsComponentsV2,
              components: [expiredContainer],
            })
            .catch(() => {});
        } catch (err) {
          console.error("Error editing expired message:", err);
        }
      });
    } catch (error) {
      console.error("Antinuke command error:", error);
      const errorMessage = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${client.emoji.cross} | An unexpected error occurred. Please try again later.`
        )
      );
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorMessage],
      });
    }
  },
};
