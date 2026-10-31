const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require("discord.js");
const { getSettings } = require("@data/welcomesystem");

module.exports = {
  name: "welcome",
  category: "Welcome",
  aliases: ["setwlc", "setwelcome", "wlcy", "wel"],
  description: "Configure the welcome system for your server",
  args: false,
  usage: "[on/off/channel/test/message/reset/info]",
  userPerms: ["Administrator"],

  execute: async (message, args, client, prefix) => {
    const settings = await getSettings(message.guild);

    if (!settings) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Settings Not Found")
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "**Error:** Settings not configured for this server.\n\nPlease contact an administrator to initialize the welcome system."
          )
        );

      return message.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (!message.member.permissions.has("Administrator")) {
      const permContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Permission Denied")
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "**Access Denied:** You must have `Administrator` permissions to run this command.\n\nContact a server administrator for assistance."
          )
        );

      return message.reply({
        components: [permContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# ⚠️ Invalid Action")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Error:** Invalid action \`${args[0]}\`.\n\n` +
            `**Valid Actions:**\n` +
            `• \`${prefix}welcome\` - Main dashboard\n` +
            `• \`${prefix}welcome on/off\` - Toggle system\n` +
            `• \`${prefix}welcome channel #channel\` - Set channel\n` +
            `• \`${prefix}welcome test\` - Test message\n` +
            `• \`${prefix}welcome message\` - Configure message\n` +
            `• \`${prefix}welcome reset\` - Reset settings\n` +
            `• \`${prefix}welcome info\` - Show info`
        )
      );

    // Handle arguments first before showing main panel
    if (args[0]) {
      const action = args[0].toLowerCase();

      switch (action) {
        case "on":
        case "off":
          return handleToggleAction(message, args, client, prefix, settings);

        case "channel":
          return handleChannelAction(message, args, client, prefix, settings);

        case "test":
          return handleTestAction(message, args, client, prefix, settings);

        case "message":
        case "msg":
          return handleMessageAction(message, args, client, prefix, settings);

        case "reset":
          return handleResetAction(message, args, client, prefix, settings);

        case "info":
          return handleInfoAction(message, args, client, prefix, settings);

        default:
          return message.reply({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2,
          });
      }
    }

    // If no arguments provided, show main welcome panel
    const isEnabled = settings.welcome?.enabled || false;
    const channelName = settings.welcome?.channel
      ? `<#${settings.welcome.channel}>`
      : "Not Set";

    const mainContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Welcome System Configuration")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Status:** ${isEnabled ? client.emoji.tick : client.emoji.cross}\n` +
            `**Channel:** ${channelName}\n` +
            `**Auto-Delete:** ${settings.welcome?.autodel || 0}s\n\n` +
            `Use the buttons below to configure your welcome system.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder());

    const buttonRows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`welcome_toggle_${message.guild.id}`)
          .setEmoji(isEnabled ? client.emoji.cross : client.emoji.tick)
          .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`welcome_channel_${message.guild.id}`)
          .setLabel("Set Channel")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`welcome_test_${message.guild.id}`)
          .setLabel("Test Welcome")
          .setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`welcome_message_${message.guild.id}`)
          .setLabel("Configure Message")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`welcome_reset_${message.guild.id}`)
          .setLabel("Reset Settings")
          .setStyle(ButtonStyle.Danger)
      ),
    ];

    const msg = await message.reply({
      components: [mainContainer, ...buttonRows],
      flags: MessageFlags.IsComponentsV2,
    });

    // Handle button interactions
    const filter = (interaction) => {
      return (
        interaction.customId.startsWith("welcome_") &&
        interaction.customId.endsWith(`_${message.guild.id}`) &&
        interaction.user.id === message.author.id
      );
    };

    const collector = msg.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutes
    });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.customId.includes("toggle")) {
          const newStatus = !settings.welcome?.enabled;
          const response = await client.util.setStatus(
            settings,
            newStatus ? "ON" : "OFF"
          );

          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("#Welcome System Updated")
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Success!** ${response}`)
            );

          await interaction.update({
            components: [successContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.customId.includes("channel")) {
          const channelContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("# Welcome Channel")
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Instructions:** Please mention the channel where welcome messages should be sent.\n\n` +
                  `**Example:** \`${prefix}welcome channel #general\`\n\n` +
                  `**Current Channel:** ${settings.welcome?.channel ? `<#${settings.welcome.channel}>` : "Not Set"}`
              )
            );

          await interaction.update({
            components: [channelContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.customId.includes("test")) {
          const response = await client.util.sendPreview(
            settings,
            message.member
          );

          const testContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("# Welcome Test")
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Test Result:** ${response}`
              )
            );

          await interaction.update({
            components: [testContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.customId.includes("message")) {
          const messageContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                "# ✏️ Welcome Message Configuration"
              )
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Instructions:** Use the \`welcomemessage\` command to configure:\n\n` +
                  `\`${prefix}welcomemessage title <text>\`\n` +
                  `\`${prefix}welcomemessage description <text>\`\n` +
                  `\`${prefix}welcomemessage color #hexcode\`\n` +
                  `\`${prefix}welcomemessage thumbnail <url>\`\n` +
                  `\`${prefix}welcomemessage image <url>\`\n` +
                  `\`${prefix}welcomemessage autodel <seconds>\`\n\n` +
                  `**Variables:**\n` +
                  `\`{server_name}\` - Server Name\n` +
                  `\`{server_id}\` - Server ID\n` +
                  `\`{server_icon}\` - Server Icon URL\n` +
                  `\`{server_ownerId}\` - Server Owner's ID\n` +
                  `\`{server_owner}\` - Mention Server Owner\n` +
                  `\`{server_memberCount}\` - Server Member Count\n` +
                  `\`{user_display}\` - User's Display Name\n` +
                  `\`{user_avatar}\` - User's Avatar URL\n` +
                  `\`{user_name}\` - User's Username\n` +
                  `\`{user}\` - Mention User\n` +
                  `\`{user_id}\` - User's ID\n` +
                  `\`{user_created:at}\` - Account Creation Timestamp`
              )
            );

          await interaction.update({
            components: [messageContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        } else if (interaction.customId.includes("reset")) {
          const resetContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("# Reset Welcome Settings")
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Instructions:** Use the \`welcomereset\` command to reset settings:\n\n` +
                  `\`${prefix}welcomereset all\` - Reset everything\n` +
                  `\`${prefix}welcomereset title\` - Reset title only\n` +
                  `\`${prefix}welcomereset description\` - Reset description only\n` +
                  `\`${prefix}welcomereset color\` - Reset color only\n\n` +
                  `**⚠️ Warning:** This action cannot be undone!`
              )
            );

          await interaction.update({
            components: [resetContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      } catch (error) {
        console.error("Welcome interaction error:", error);
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timeoutContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Session Timeout")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              "**Timeout:** The configuration session has expired.\n\nPlease run the command again to make changes."
            )
          );

        msg
          .edit({
            components: [timeoutContainer],
            flags: MessageFlags.IsComponentsV2,
          })
          .catch(() => {});
      }
    });
  },
};

// ================================
// ACTION HANDLERS
// ================================

async function handleChannelAction(message, args, client, prefix, settings) {
  const channel =
    message.mentions.channels.first() ||
    message.guild.channels.cache.get(args[1]);

  if (!channel) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Channel Required")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Error:** You didn't mention the channel to set as welcome channel.\n\n` +
            `**Usage:** \`${prefix}welcome channel #general\`\n` +
            `**Example:** \`${prefix}welcome channel #welcome\`\n\n` +
            `**Current Channel:** ${settings.welcome?.channel ? `<#${settings.welcome.channel}>` : "Not Set"}`
        )
      );

    return message.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  try {
    const response = await client.util.setChannel(settings, channel);
    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("#Welcome Channel Updated")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Success!** Welcome channel has been updated.\n\n` +
            `**New Channel:** ${channel}\n` +
            `**Channel ID:** \`${channel.id}\`\n\n` +
            `All welcome messages will now be sent to this channel.`
        )
      );

    return message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("Welcome channel error:", error);
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# ❌ Error")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "**Error:** An error occurred while setting the welcome channel.\n\n" +
            "Please ensure the bot has the necessary permissions in the selected channel and try again."
        )
      );

    return message.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

async function handleTestAction(message, args, client, prefix, settings) {
  if (!settings.welcome?.enabled) {
    const disabledContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Welcome System Disabled")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Notice:** The welcome system is currently disabled for this server.\n\n` +
            `**To enable it:** \`${prefix}welcome on\`\n` +
            `**To configure:** \`${prefix}welcome\`\n\n` +
            `Enable the welcome system first before testing.`
        )
      );

    return message.reply({
      components: [disabledContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  try {
    // Show loading first
    const loadingContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Testing Welcome Message")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "**Please wait...** Generating welcome message preview...\n\n" +
            "This may take a few seconds."
        )
      );

    const msg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const response = await client.util.sendPreview(settings, message.member);

    const testContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Welcome Message Test")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Test Completed Successfully!**\n\n` +
            `**Result:** ${response}\n\n` +
            `**Test User:** ${message.member.user.username}\n` +
            `**Test Channel:** ${settings.welcome?.channel ? `<#${settings.welcome.channel}>` : "Not Set"}\n\n` +
            `**Note:** This is how the welcome message will appear when a new member joins your server.`
        )
      );

    await msg.edit({
      components: [testContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("Welcome test error:", error);
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# ❌ Test Failed")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "**Error:** An error occurred while testing the welcome message.\n\n" +
            "**Possible Issues:**\n" +
            "• Welcome channel not set\n" +
            "• Bot missing permissions\n" +
            "• Welcome message not configured\n\n" +
            `**Solution:** Run \`${prefix}welcome\` to configure the system properly.`
        )
      );

    return message.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

async function handleMessageAction(message, args, client, prefix, settings) {
  const messageContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# Welcome Message Configuration")
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Current Settings:**\n` +
          `• **Title:** ${settings.welcome?.embed?.title || "Not Set"}\n` +
          `• **Description:** ${settings.welcome?.embed?.description ? "Set" : "❌ Not Set"}\n` +
          `• **Color:** ${settings.welcome?.embed?.color || "Default"}\n` +
          `• **Thumbnail:** ${settings.welcome?.embed?.thumbnail ? "Enabled" : "❌ Disabled"}\n` +
          `• **Image:** ${settings.welcome?.embed?.image ? "Set" : "❌ Not Set"}\n` +
          `• **Auto-Delete:** ${settings.welcome?.autodel || 0}s\n\n` +
          `Use the buttons below to configure each setting interactively.`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Available Variables:**\n` +
          `\`{server_name}\` - Server Name\n` +
          `\`{server_id}\` - Server ID\n` +
          `\`{server_icon}\` - Server Icon URL\n` +
          `\`{server_ownerId}\` - Server Owner's ID\n` +
          `\`{server_owner}\` - Mention Server Owner\n` +
          `\`{server_memberCount}\` - Server Member Count\n` +
          `\`{user_display}\` - User's Display Name\n` +
          `\`{user_avatar}\` - User's Avatar URL\n` +
          `\`{user_name}\` - User's Username\n` +
          `\`{user}\` - Mention User\n` +
          `\`{user_id}\` - User's ID\n` +
          `\`{user_created:at}\` - Account Creation Timestamp`
      )
    );

  const buttonRows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`msg_title_${message.guild.id}`)
        .setLabel("Set Title")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`msg_description_${message.guild.id}`)
        .setLabel("Set Description")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`msg_color_${message.guild.id}`)
        .setLabel("Set Color")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`msg_thumbnail_${message.guild.id}`)
        .setLabel("Set Thumbnail")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`msg_image_${message.guild.id}`)
        .setLabel("Set Image")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`msg_autodel_${message.guild.id}`)
        .setLabel("Set Auto-Delete")
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`msg_preview_${message.guild.id}`)
        .setLabel("Preview Message")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`msg_reset_${message.guild.id}`)
        .setLabel("Reset All")
        .setStyle(ButtonStyle.Danger)
    ),
  ];

  const msg = await message.reply({
    components: [messageContainer, ...buttonRows],
    flags: MessageFlags.IsComponentsV2,
  });

  // Handle button interactions
  const filter = (interaction) => {
    return (
      interaction.customId.startsWith("msg_") &&
      interaction.customId.endsWith(`_${message.guild.id}`) &&
      interaction.user.id === message.author.id
    );
  };

  const collector = msg.createMessageComponentCollector({
    filter,
    time: 300000, // 5 minutes
  });

  const updateContainer = (currentSettings) => {
    return new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "# ✏️ Welcome Message Configuration"
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Current Settings:**\n` +
            `• **Title:** ${currentSettings.welcome?.embed?.title || "Not Set"}\n` +
            `• **Description:** ${currentSettings.welcome?.embed?.description ? "Set" : "❌ Not Set"}\n` +
            `• **Color:** ${currentSettings.welcome?.embed?.color || "Default"}\n` +
            `• **Thumbnail:** ${currentSettings.welcome?.embed?.thumbnail ? "Enabled" : "❌ Disabled"}\n` +
            `• **Image:** ${currentSettings.welcome?.embed?.image ? "Set" : "❌ Not Set"}\n` +
            `• **Auto-Delete:** ${currentSettings.welcome?.autodel || 0}s\n\n` +
            `Use the buttons below to configure each setting interactively.`
        )
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Available Variables:**\n` +
            `\`{server_name}\`, \`{user}\`, \`{user_name}\`, \`{server_memberCount}\`, \`{user_id}\`, \`{server_id}\``
        )
      );
  };

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.customId.includes("title")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Welcome Title")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please type your welcome title in the next message.\n\n` +
                `**Current Title:** ${settings.welcome?.embed?.title || "Not Set"}\n\n` +
                `**Variables you can use:**\n` +
                `\`{server_name}\`, \`{user}\`, \`{user_name}\`, \`{server_memberCount}\`\n\n` +
                `**Example:** \`Welcome to {server_name}, {user_name}!\`\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const response = await client.util.setTitle(settings, userInput);

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          // Delete user's input message
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("description")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Welcome Description")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please type your welcome description in the next message.\n\n` +
                `**Current Description:** ${settings.welcome?.embed?.description ? "Set" : "❌ Not Set"}\n\n` +
                `**Variables you can use:**\n` +
                `\`{server_name}\`, \`{user}\`, \`{user_name}\`, \`{server_memberCount}\`\n\n` +
                `**Example:** \`Hello {user}! Welcome to {server_name}. You are member #{server_memberCount}!\`\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const response = await client.util.setDescription(
            settings,
            userInput
          );

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          // Delete user's input message
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("color")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Set Welcome Color")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please type a hex color code in the next message.\n\n` +
                `**Current Color:** ${settings.welcome?.embed?.color || "Default"}\n\n` +
                `**Format:** \`#hexcode\`\n` +
                `**Examples:** \`#ff0000\` (red), \`#00ff00\` (green), \`#0000ff\` (blue)\n` +
                `**Popular Colors:** \`#7289da\` (blurple), \`#57f287\` (green), \`#faa61a\` (yellow)\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const response = await client.util.setColor(settings, userInput);

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          // Delete user's input message
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("thumbnail")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Set Welcome Thumbnail")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please provide an image URL in the next message.\n\n` +
                `**Current Thumbnail:** ${settings.welcome?.embed?.thumbnail ? "Enabled" : "❌ Disabled"}\n\n` +
                `**Format:** Direct image URL (jpg, png, gif)\n` +
                `**Example:** \`https://example.com/image.png\`\n` +
                `**Special:** Type \`guild\` to use server icon, or \`disable\` to remove\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const response = await client.util.setThumbnail(settings, userInput);

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          // Delete user's input message
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("image")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Set Welcome Image")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please provide an image URL in the next message.\n\n` +
                `**Current Image:** ${settings.welcome?.embed?.image ? "Set" : "❌ Not Set"}\n\n` +
                `**Format:** Direct image URL (jpg, png, gif)\n` +
                `**Example:** \`https://example.com/welcome-banner.png\`\n` +
                `**Special:** Type \`disable\` to remove the image\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const response = await client.util.setImage(settings, userInput);

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          // Delete user's input message
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("autodel")) {
        const inputContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Set Auto-Delete Timer")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Instructions:** Please provide the auto-delete time in seconds.\n\n` +
                `**Current Auto-Delete:** ${settings.welcome?.autodel || 0}s\n\n` +
                `**Format:** Number of seconds (0-300)\n` +
                `**Examples:** \`0\` (disabled), \`10\` (10 seconds), \`60\` (1 minute)\n` +
                `**Maximum:** 300 seconds (5 minutes)\n\n` +
                `**Note:** You have 60 seconds to respond.`
            )
          );

        await interaction.update({
          components: [inputContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 60000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected) {
          const userInput = collected.first().content;
          const updatedSettings = await getSettings(message.guild);
          updatedSettings.welcome.autodel(userInput);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });

          collected
            .first()
            .delete()
            .catch(() => {});
        }
      } else if (interaction.customId.includes("preview")) {
        const response = await client.util.sendPreview(
          settings,
          message.member
        );

        const previewContainer = updateContainer(settings)
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Preview Result:** ${response}`
            )
          );

        await interaction.update({
          components: [previewContainer, ...buttonRows],
          flags: MessageFlags.IsComponentsV2,
        });
      } else if (interaction.customId.includes("reset")) {
        const confirmContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# ⚠️ Confirm Reset")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**WARNING:** This will reset ALL welcome message settings!\n\n` +
                `**This will reset:**\n` +
                `• Title\n• Description\n• Color\n• Thumbnail\n• Image\n• Auto-Delete Timer\n\n` +
                `**This action cannot be undone!**\n\n` +
                `Type \`CONFIRM\` to proceed, or anything else to cancel.`
            )
          );

        await interaction.update({
          components: [confirmContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        const msgFilter = (m) => m.author.id === message.author.id;
        const collected = await message.channel
          .awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 30000,
            errors: ["time"],
          })
          .catch(() => null);

        if (collected && collected.first().content === "CONFIRM") {
          const response = await client.util.resetAll(settings);

          // Refresh settings
          const updatedSettings = await getSettings(message.guild);

          const successContainer = updateContainer(updatedSettings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`**✅ Success:** ${response}`)
            );

          await interaction.editReply({
            components: [successContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          const cancelContainer = updateContainer(settings)
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**❌ Cancelled:** Reset operation was cancelled.`
              )
            );

          await interaction.editReply({
            components: [cancelContainer, ...buttonRows],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        // Delete user's input message
        if (collected) {
          collected
            .first()
            .delete()
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error("Message config interaction error:", error);

      const errorContainer = updateContainer(settings)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**❌ Error:** An error occurred while processing your request.`
          )
        );

      await interaction.editReply({
        components: [errorContainer, ...buttonRows],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  });

  collector.on("end", (collected, reason) => {
    if (reason === "time") {
      const timeoutContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Session Timeout")
        )
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "**Timeout:** The configuration session has expired.\n\nPlease run the command again to make changes."
          )
        );

      msg
        .edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => {});
    }
  });
}

async function handleResetAction(message, args, client, prefix, settings) {
  const resetContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# Reset Welcome Settings")
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Instructions:** Use the \`welcomereset\` command to reset settings:\n\n` +
          `\`${prefix}welcomereset all\` - Reset everything\n` +
          `\`${prefix}welcomereset title\` - Reset title only\n` +
          `\`${prefix}welcomereset description\` - Reset description only\n` +
          `\`${prefix}welcomereset color\` - Reset color only\n` +
          `\`${prefix}welcomereset image\` - Reset image only\n` +
          `\`${prefix}welcomereset thumbnail\` - Reset thumbnail only\n` +
          `\`${prefix}welcomereset autodel\` - Reset auto-delete only\n\n` +
          `**⚠️ Warning:** This action cannot be undone!`
      )
    );

  return message.reply({
    components: [resetContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleInfoAction(message, args, client, prefix, settings) {
  const isEnabled = settings.welcome?.enabled || false;
  const channelName = settings.welcome?.channel
    ? `<#${settings.welcome.channel}>`
    : "Not Set";

  const infoContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("# ℹ️ Welcome System Information")
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**System Status:** ${isEnabled ? client.emoji.tick : client.emoji.cross}\n` +
          `**Welcome Channel:** ${channelName}\n` +
          `**Auto-Delete Time:** ${settings.welcome?.autodel || 0} seconds\n\n` +
          `**Message Settings:**\n` +
          `• **Title:** ${settings.welcome?.embed?.title ? client.emoji.tick : client.emoji.cross}\n` +
          `• **Description:** ${settings.welcome?.embed?.description ? client.emoji.tick : client.emoji.cross}\n` +
          `• **Color:** ${settings.welcome?.embed?.color || "Default"}\n` +
          `• **Thumbnail:** ${settings.welcome?.embed?.thumbnail ? client.emoji.tick : client.emoji.cross}\n` +
          `• **Image:** ${settings.welcome?.embed?.image ? client.emoji.tick : client.emoji.cross}`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Available Commands:**\n` +
          `• \`${prefix}welcome\` - Main configuration panel\n` +
          `• \`${prefix}welcome on/off\` - Toggle the system\n` +
          `• \`${prefix}welcome channel #channel\` - Set welcome channel\n` +
          `• \`${prefix}welcome test\` - Test welcome message\n` +
          `• \`${prefix}welcome message\` - Message configuration help\n` +
          `• \`${prefix}welcomemessage <option> <value>\` - Configure message\n` +
          `• \`${prefix}welcomereset <option>\` - Reset settings`
      )
    );

  return message.reply({
    components: [infoContainer],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleToggleAction(message, args, client, prefix, settings) {
  const status = args[0].toUpperCase();

  try {
    const response = await client.util.setStatus(settings, status);
    const successContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("#Welcome Status Updated")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Success!** ${response}\n\n` +
            `**Status:** ${status === "ON" ? client.emoji.tick : client.emoji.corss}\n\n` +
            `Use \`${prefix}welcome\` to access the full configuration panel.`
        )
      );

    return message.reply({
      components: [successContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error("Error calling setStatus:", error);
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# ❌ Error")
      )
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "**Error:** An error occurred while trying to update the welcome status.\n\nPlease try again later."
        )
      );

    return message.reply({
      components: [errorContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
