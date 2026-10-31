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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const AntiBadword = require("@data/antibadword");

module.exports = {
  name: "antibadword",
  aliases: ["abw", "antiword"],
  description: "Advanced Anti-Badword system with comprehensive management.",
  category: "Automod",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageGuild", "ManageMessages", "ViewChannel"],
  cooldown: 3,

  execute: async (message, args, client) => {
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;

      let antiBadwordData = await AntiBadword.findOne({ guildId });
      if (!antiBadwordData) {
        antiBadwordData = new AntiBadword({ guildId });
        await antiBadwordData.save();
      }

      const container = createMainContainer(antiBadwordData, client);

      const mainMessage = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      const collector = mainMessage.createMessageComponentCollector({
        time: 300000, // 5 minutes
        filter: (i) => {
          if (i.user.id !== userId) {
            i.reply({
              content: `> <:cross:1429515360742281246> Only ${message.author} can use this interface.`,
              ephemeral: true,
            }).catch(() => {});
            return false;
          }
          return true;
        },
      });

      collector.on("collect", async (interaction) => {
        try {
          await handleMainInteraction(interaction, client);
        } catch (error) {
          console.error("Interaction error:", error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `> <:cross:1429515360742281246> An error occurred while processing this action.`,
                ephemeral: true,
              }).catch(() => {});
          }
        }
      });

      collector.on("end", async (collected, reason) => {
        try {
          const disabledContainer = createDisabledContainer(reason, client);
          await mainMessage.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [disabledContainer],
          }).catch(() => {});
        } catch (error) {
          console.error("Error disabling components:", error);
        }
      });
    } catch (error) {
      console.error("AntiBadword command error:", error);
    }
  },
};

// --- Container Builders ---

function createMainContainer(config, client) {
  const container = new ContainerBuilder();
  const statusText = config.isEnabled ? client.emoji.tick : client.emoji.cross;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# **Anti-Badword System - ${client.user.username}**\n> Comprehensive word and phrase protection.`)
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **System Status:** ${statusText}`)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **Filtered Words:** ${config.badWords.length} | **Max Strikes:** ${config.maxStrikes}`)
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **Action:** ${getActionDisplay(config.action)} | **Punishment:** ${getPunishmentDisplay(config.punishment)}`)
  );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("abw_toggle").setLabel("Toggle System").setStyle(config.isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId("abw_manage_words").setLabel("Manage Bad Words").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("abw_settings").setLabel("Action Settings").setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("abw_whitelist").setLabel("Manage Whitelist").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("abw_logs").setLabel("Log Settings").setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(row1, row2);
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`Last updated: ${config.updatedAt?.toLocaleString() || "Never"}`)
  );

  return container;
}

// --- Main Interaction Router ---

async function handleMainInteraction(interaction, client) {
  const { customId } = interaction;
  const config = await AntiBadword.findOne({ guildId: interaction.guild.id });

  // Modal submissions are handled first as they are a unique interaction type
  if (interaction.isModalSubmit()) {
    if (customId === "abw_add_word_modal") return handleAddWordModalSubmit(interaction, config);
    if (customId === "abw_strikes_modal") return handleStrikesModalSubmit(interaction, config);
    return;
  }

  // Button Interactions
  if (interaction.isButton()) {
    // Defer the update for all button clicks except those that open a modal
    if (customId !== 'abw_add_word' && customId !== 'abw_configure_strikes') {
        await interaction.deferUpdate();
    }
    switch (customId) {
      case "abw_toggle": return handleToggle(interaction, config, client);
      case "abw_manage_words": return handleManageWords(interaction, config, client);
      case "abw_add_word": return showAddWordModal(interaction);
      case "abw_remove_word": return showRemoveWordMenu(interaction, config, client);
      case "abw_settings": return handleSettings(interaction, config, client);
      case "abw_configure_strikes": return showStrikesModal(interaction, config);
      case "abw_whitelist": return handleWhitelist(interaction, config, client);
      case "abw_logs": return handleLogs(interaction, config, client);
      case "abw_back_main": return interaction.editReply({ components: [createMainContainer(config, client)] });
      case "abw_back_words": return handleManageWords(interaction, config, client);
      case "abw_back_whitelist": return handleWhitelist(interaction, config, client);
      // Whitelist Add/Remove Buttons
      case "abw_wl_add_users": return showWhitelistSelector(interaction, "user", "add", config, client);
      case "abw_wl_remove_users": return showWhitelistSelector(interaction, "user", "remove", config, client);
      case "abw_wl_add_roles": return showWhitelistSelector(interaction, "role", "add", config, client);
      case "abw_wl_remove_roles": return showWhitelistSelector(interaction, "role", "remove", config, client);
      case "abw_wl_add_channels": return showWhitelistSelector(interaction, "channel", "add", config, client);
      case "abw_wl_remove_channels": return showWhitelistSelector(interaction, "channel", "remove", config, client);
    }
  }

  // Select Menu Interactions
  if (interaction.isAnySelectMenu()) {
    await interaction.deferUpdate();
    if (interaction.isStringSelectMenu()) {
        if (customId === "action_select") return handleActionSelect(interaction, config, client);
        if (customId === "punishment_select") return handlePunishmentSelect(interaction, config, client);
        if (customId === "abw_remove_word_select") return handleRemoveWordSelect(interaction, config, client);
    }
    if (interaction.isUserSelectMenu() && customId.startsWith("abw_wl_user")) return handleWhitelistSelection(interaction, config, "whitelistUsers", client);
    if (interaction.isRoleSelectMenu() && customId.startsWith("abw_wl_role")) return handleWhitelistSelection(interaction, config, "whitelistRoles", client);
    if (interaction.isChannelSelectMenu()) {
        if (customId.startsWith("abw_wl_channel")) return handleWhitelistSelection(interaction, config, "whitelistChannels", client);
        if (customId === "log_channel_select") return handleLogChannelSelect(interaction, config, client);
    }
  }
}

// --- Core Handlers ---

async function handleToggle(interaction, config, client) {
  config.isEnabled = !config.isEnabled;
  await config.save();
  await interaction.editReply({ components: [createMainContainer(config, client)] });
}

async function handleManageWords(interaction, config, client) {
  const container = new ContainerBuilder();
  const wordList = config.badWords.length > 0 ? config.badWords.map((w) => `\`${w}\``).join(", ") : "No words configured.";
  
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent("# Manage Bad Words\n> Add or remove filtered words."));
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Current Words:**\n${wordList.substring(0, 1000)}${wordList.length > 1000 ? "..." : ""}`));
  container.addSeparatorComponents(new SeparatorBuilder());
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("abw_add_word").setLabel("Add Words").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("abw_remove_word").setLabel("Remove Words").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("abw_back_main").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(row);
  
  await interaction.editReply({ components: [container] });
}

async function handleSettings(interaction, config, client) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("# Action Settings\n> Configure system behavior."));
    container.addSeparatorComponents(new SeparatorBuilder());

    const actionSelect = new StringSelectMenuBuilder()
        .setCustomId("action_select")
        .setPlaceholder("Choose actions on detection (Delete is always on)")
        .setMinValues(0).setMaxValues(2)
        .addOptions([
            { label: "Warn User in Channel", value: "warn", default: config.action.includes("warn") },
            { label: "Log Infraction", value: "log", default: config.action.includes("log") },
        ]);

    const punishmentSelect = new StringSelectMenuBuilder()
        .setCustomId("punishment_select")
        .setPlaceholder("Choose punishment after max strikes")
        .addOptions([
            { label: "No Punishment", value: "none", default: config.punishment === "none" },
            { label: "Timeout User (5m)", value: "timeout", default: config.punishment === "timeout" },
            { label: "Kick User", value: "kick", default: config.punishment === "kick" },
            { label: "Ban User", value: "ban", default: config.punishment === "ban" },
        ]);

    const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("abw_configure_strikes").setLabel("Configure Strikes").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("abw_back_main").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(new ActionRowBuilder().addComponents(actionSelect));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(punishmentSelect));
    container.addActionRowComponents(buttonsRow);

    await interaction.editReply({ components: [container] });
}

// --- Modal Handlers ---

async function showAddWordModal(interaction) {
    const modal = new ModalBuilder().setCustomId("abw_add_word_modal").setTitle("Add Bad Words");
    const wordsInput = new TextInputBuilder().setCustomId("words_to_add").setLabel("Words to add (comma-separated)").setStyle(TextInputStyle.Paragraph).setPlaceholder("word1, phrase 2, another word").setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(wordsInput));
    await interaction.showModal(modal);
}

async function handleAddWordModalSubmit(interaction, config) {
    await interaction.deferReply({ ephemeral: true });
    const wordsRaw = interaction.fields.getTextInputValue("words_to_add");
    const words = wordsRaw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
    const addedWords = [];

    words.forEach(word => {
        if (!config.badWords.includes(word)) {
            config.badWords.push(word);
            addedWords.push(word);
        }
    });

    if (addedWords.length > 0) {
        await config.save();
        await interaction.followUp({ content: `> <:tick:1429515372519886898> Added **${addedWords.length}** new word(s).` });
    } else {
        await interaction.followUp({ content: `> <:info:1429515357927772453> No new words were added.` });
    }
}

async function showStrikesModal(interaction, config) {
    const modal = new ModalBuilder().setCustomId("abw_strikes_modal").setTitle("Configure Max Strikes");
    const strikesInput = new TextInputBuilder().setCustomId("max_strikes_input").setLabel("Strikes before punishment (e.g., 3)").setStyle(TextInputStyle.Short).setValue(String(config.maxStrikes)).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(strikesInput));
    await interaction.showModal(modal);
}

async function handleStrikesModalSubmit(interaction, config) {
    await interaction.deferReply({ ephemeral: true });
    const strikesValue = interaction.fields.getTextInputValue("max_strikes_input");
    const numStrikes = parseInt(strikesValue, 10);

    if (isNaN(numStrikes) || numStrikes < 1 || numStrikes > 100) {
        return interaction.followUp({ content: `> <:cross:1429515360742281246> Please provide a valid number between 1 and 100.` });
    }
    config.maxStrikes = numStrikes;
    await config.save();
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Max strikes set to **${numStrikes}**.` });
}

// --- Word & Log Management ---

async function showRemoveWordMenu(interaction, config, client) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("**Remove Bad Words**\nSelect words to remove."));

    if (config.badWords.length > 0) {
        const options = config.badWords.slice(0, 25).map((word) => ({ label: word, value: word }));
        const selectMenu = new StringSelectMenuBuilder().setCustomId("abw_remove_word_select").setPlaceholder(`Select from the first 25 words... (${config.badWords.length} total)`).setMinValues(1).setMaxValues(options.length).addOptions(options);
        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent("There are no words to remove."));
    }
    const backRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_back_words").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary));
    container.addActionRowComponents(backRow);
    await interaction.editReply({ components: [container] });
}

async function handleRemoveWordSelect(interaction, config, client) {
    const wordsToRemove = interaction.values;
    config.badWords = config.badWords.filter((w) => !wordsToRemove.includes(w));
    await config.save();
    await handleManageWords(interaction, config, client);
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Successfully removed **${wordsToRemove.length}** word(s).`, ephemeral: true });
}

async function handleLogs(interaction, config, client) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("# Log Settings\n> Choose a channel for logs."));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`- **Current Log Channel:** ${config.logChannel ? `<#${config.logChannel}>` : "None"}`));
    
    const select = new ChannelSelectMenuBuilder().setCustomId("log_channel_select").setPlaceholder("Select a channel").setMinValues(1).setMaxValues(1);
    const back = new ButtonBuilder().setCustomId("abw_back_main").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary);

    container.addActionRowComponents(new ActionRowBuilder().addComponents(select));
    container.addActionRowComponents(new ActionRowBuilder().addComponents(back));
    await interaction.editReply({ components: [container] });
}

// --- Selection Handlers ---

async function handleActionSelect(interaction, config, client) {
    // FIX: Convert array to a string to match schema
    config.action = ["delete", ...interaction.values].join('_');
    await config.save();
    await handleSettings(interaction, config, client);
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Actions updated.`, ephemeral: true });
}

async function handlePunishmentSelect(interaction, config, client) {
    config.punishment = interaction.values[0];
    await config.save();
    await handleSettings(interaction, config, client);
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Punishment set to **${getPunishmentDisplay(config.punishment)}**.`, ephemeral: true });
}

async function handleLogChannelSelect(interaction, config, client) {
    config.logChannel = interaction.values[0];
    await config.save();
    await handleLogs(interaction, config, client);
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Log channel set to <#${config.logChannel}>.`, ephemeral: true });
}

// --- Whitelist UI & Logic ---

async function handleWhitelist(interaction, config, client) {
    const container = new ContainerBuilder();
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent("# Whitelist Management\n> Manage users, roles, and channels that bypass the system."));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Whitelisted Users:**\n> ${formatWhitelistItems(config.whitelistUsers, "user") || "None"}`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Whitelisted Roles:**\n> ${formatWhitelistItems(config.whitelistRoles, "role") || "None"}`));
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Whitelisted Channels:**\n> ${formatWhitelistItems(config.whitelistChannels, "channel") || "None"}`));
    container.addSeparatorComponents(new SeparatorBuilder());

    const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_wl_add_users").setLabel("Add Users").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("abw_wl_remove_users").setLabel("Remove Users").setStyle(ButtonStyle.Danger));
    const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_wl_add_roles").setLabel("Add Roles").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("abw_wl_remove_roles").setLabel("Remove Roles").setStyle(ButtonStyle.Danger));
    const row3 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_wl_add_channels").setLabel("Add Channels").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("abw_wl_remove_channels").setLabel("Remove Channels").setStyle(ButtonStyle.Danger));
    const backRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_back_main").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary));

    container.addActionRowComponents(row1, row2, row3, backRow);
    await interaction.editReply({ components: [container] });
}

async function showWhitelistSelector(interaction, type, mode, config, client) {
    const title = `${mode.charAt(0).toUpperCase() + mode.slice(1)} Whitelist ${type.charAt(0).toUpperCase() + type.slice(1)}s`;
    const customId = `abw_wl_${type}_${mode}`;
    const placeholder = `Select ${type}s to ${mode}`;
    const list = config[`whitelist${type.charAt(0).toUpperCase() + type.slice(1)}s`];

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));

    if (mode === 'remove' && list.length === 0) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`There are no whitelisted ${type}s to remove.`));
    } else {
        let selectMenu;
        if (type === 'user') selectMenu = new UserSelectMenuBuilder();
        if (type === 'role') selectMenu = new RoleSelectMenuBuilder();
        if (type === 'channel') selectMenu = new ChannelSelectMenuBuilder();
        selectMenu.setCustomId(customId).setPlaceholder(placeholder).setMinValues(1).setMaxValues(25);
        container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));
    }
    
    container.addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("abw_back_whitelist").setEmoji(client.emoji.left).setStyle(ButtonStyle.Secondary)));
    await interaction.editReply({ components: [container] });
}

async function handleWhitelistSelection(interaction, config, field, client) {
    const mode = interaction.customId.endsWith('add') ? 'add' : 'remove';
    const selectedIds = interaction.values;
    let changedCount = 0;

    if (mode === 'add') {
        selectedIds.forEach(id => {
            if (!config[field].includes(id)) {
                config[field].push(id);
                changedCount++;
            }
        });
    } else {
        const initialCount = config[field].length;
        config[field] = config[field].filter(id => !selectedIds.includes(id));
        changedCount = initialCount - config[field].length;
    }

    if (changedCount > 0) {
        await config.save();
    }
    
    await handleWhitelist(interaction, config, client);
    await interaction.followUp({ content: `> <:tick:1429515372519886898> Whitelist updated. **${changedCount}** item(s) ${mode}.`, ephemeral: true });
}

// --- Helper Functions ---

function formatWhitelistItems(items, type) {
    if (!items || items.length === 0) return "";
    const prefix = { user: "@", role: "@&", channel: "#" };
    return items.map((id) => `<${prefix[type]}${id}>`).join(", ");
}

function createDisabledContainer(reason, client) {
    const container = new ContainerBuilder();
    const reasonText = reason === "time" ? "Session Expired" : "Session Ended";
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${client.emoji.time} **${reasonText}**\nThis interface has been disabled.`));
    return container;
}

// FIX: This function is now robust and handles both legacy string and new array data.
function getActionDisplay(action) {
    let actions;

    // Handle legacy string format (e.g., "delete_warn") and convert to an array
    if (typeof action === 'string') {
        actions = action.split('_');
    } 
    // Handle the expected array format
    else if (Array.isArray(action)) {
        actions = action;
    } 
    // Provide a fallback for undefined, null, or unexpected data types
    else {
        actions = ["delete"];
    }

    // Default to 'delete' if the array is empty after processing
    if (actions.length === 0) {
        actions = ["delete"];
    }

    return actions.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(" & ");
}


function getPunishmentDisplay(punishment) {
    return ({ none: "No Punishment", timeout: "Timeout User", kick: "Kick User", ban: "Ban User" })[punishment] || "No Punishment";
}

