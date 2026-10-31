const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  MessageFlags,
  DiscordAPIError,
} = require("discord.js");
const AutoReact = require("@data/autoreact");

function createDisabledContainer(reason, client) {
  const container = new ContainerBuilder();
  const reasonText = reason === "time" ? "Session Expired" : "Session Ended";
  const emoji = client.emoji.time || "⏰";
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${emoji}**${reasonText}**\nThis interface has been disabled.`
    )
  );
  const disabledButton = new ButtonBuilder()
    .setCustomId("disabled")
    .setLabel(reasonText)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);
  const row = new ActionRowBuilder().addComponents(disabledButton);
  container.addActionRowComponents(row);
  return [container];
}

function createMainContainer(autoReactData, guild, client) {
  const container = new ContainerBuilder();
  const triggerCount = autoReactData.filter((e) => e.keyword).length;
  const channelCount = autoReactData.filter(
    (e) => e.channelId && !e.keyword
  ).length;
  const totalCount = triggerCount + channelCount;
  const isEnabled = totalCount > 0;
  const statusText = isEnabled ? client.emoji.tick : client.emoji.cross;
  let lastUpdated = "Never";
  if (autoReactData.length > 0) {
    const mostRecentEntry = autoReactData.reduce((prev, current) => {
      const prevDate =
        prev.createdAt instanceof Date
          ? prev.createdAt
          : new Date(prev.createdAt);
      const currentDate =
        current.createdAt instanceof Date
          ? current.createdAt
          : new Date(current.createdAt);
      return prevDate > currentDate ? prev : current;
    });
    lastUpdated = new Date(mostRecentEntry.createdAt).toLocaleString();
  }
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# **Auto-React System **\nAutomatic emoji reactions for messages and channels`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **System Status:** ${statusText}`)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **Keyword Triggers:** ${triggerCount} | **Channel Reactions:** ${channelCount}`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  if (triggerCount > 0) {
    const triggerPreview = autoReactData
      .filter((e) => e.keyword)
      .slice(0, 5)
      .map((e) => `- \`${e.keyword}\` → ${e.emoji}`)
      .join("\n");
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Recent Triggers:**\n${triggerPreview}${
          triggerCount > 5 ? `\n*...and ${triggerCount - 5} more*` : ""
        }`
      )
    );
  }
  if (channelCount > 0) {
    const channelPreview = autoReactData
      .filter((e) => e.channelId && !e.keyword)
      .slice(0, 3)
      .map((e) => `- <#${e.channelId}> → ${e.emoji}`)
      .join("\n");
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Active Channels:**\n${channelPreview}${
          channelCount > 3 ? `\n*...and ${channelCount - 3} more*` : ""
        }`
      )
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder());
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_add_trigger")
      .setLabel("Add Trigger")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ar_add_channel")
      .setLabel("Add Channel")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ar_manage")
      .setLabel("Manage Reactions")
      .setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_list")
      .setLabel("View All")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ar_reset_triggers")
      .setLabel("Reset Triggers")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(triggerCount === 0),
    new ButtonBuilder()
      .setCustomId("ar_reset_channels")
      .setLabel("Reset Channels")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(channelCount === 0),
    new ButtonBuilder()
      .setCustomId("ar_reset_all")
      .setLabel("Reset All")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(totalCount === 0)
  );
  container.addActionRowComponents(row1, row2);
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Total Reactions: ${totalCount} | Last updated: ${lastUpdated}`
    )
  );
  return container;
}

async function handleMainInteraction(
  interaction,
  client,
  guildId,
  mainMessage
) {
  const { customId } = interaction;
  switch (customId) {
    case "ar_add_trigger":
      await handleAddTrigger(interaction, client, guildId, mainMessage);
      break;
    case "ar_add_channel":
      await handleAddChannel(interaction, client, guildId, mainMessage);
      break;
    case "ar_manage":
      await handleManage(interaction, client, guildId, mainMessage);
      break;
    case "ar_list":
      await handleList(interaction, client, guildId);
      break;
    case "ar_reset_triggers":
      await handleResetTriggers(interaction, client, guildId, mainMessage);
      break;
    case "ar_reset_channels":
      await handleResetChannels(interaction, client, guildId, mainMessage);
      break;
    case "ar_reset_all":
      await handleResetAll(interaction, client, guildId, mainMessage);
      break;
    case "ar_back":
      await handleBack(interaction, client, guildId, mainMessage);
      break;
    case "remove_trigger_select":
      await handleRemoveTrigger(interaction, client, guildId, mainMessage);
      break;
    case "remove_channel_select":
      await handleRemoveChannel(interaction, client, guildId, mainMessage);
      break;
  }
}

async function handleAddTrigger(interaction, client, guildId, mainMessage) {
  const modal = new ModalBuilder()
    .setCustomId("autoreact_modal_add_trigger")
    .setTitle("Add Trigger Reaction")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("keyword")
          .setLabel("Trigger Word/Phrase")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., hello world")
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji")
          .setLabel("Emoji (Unicode or <:name:id>)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., 😄 or <:emoji:123456789012345678>")
          .setRequired(true)
          .setMaxLength(100)
      )
    );
  // Show the modal to the user
  await interaction.showModal(modal);
  // Wait for the modal to be submitted
  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (m) => m.user.id === interaction.user.id,
      time: 60000,
    })
    .catch(() => null);
  if (modalSubmit) {
    try {
      // Defer the modal submission to avoid the 3-second timeout
      await modalSubmit.deferUpdate();
      // Get the input values from the modal
      const keyword = modalSubmit.fields
        .getTextInputValue("keyword")
        .toLowerCase();
      const emoji = modalSubmit.fields.getTextInputValue("emoji");
      // Check for an existing trigger
      const existing = await AutoReact.findOne({ guildId, keyword });
      if (existing) {
        await modalSubmit.followUp({
          content: `Trigger for **${keyword}** already exists with emoji ${existing.emoji}`,
          ephemeral: true,
        });
        return;
      }
      // Create a new auto-react trigger in the database
      await AutoReact.create({
        guildId,
        keyword,
        emoji,
        createdAt: new Date(),
      });
      await modalSubmit.followUp({
        content: ` Added auto-reaction for **${keyword}** → ${emoji}`,
        ephemeral: true,
      });
      // Update the main message with the new data
      const updatedData = await AutoReact.find({ guildId });
      const container = createMainContainer(
        updatedData,
        interaction.guild,
        client
      );
      await mainMessage.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 10062) {
        console.error(
          "AutoReact interaction error: Modal submission timed out."
        );
        // Acknowledge the timeout to the user
        await interaction
          .followUp({
            content: `The modal submission timed out. Please try again.`,
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        // Handle other errors gracefully
        console.error("Error handling modal submission:", error);
        await interaction
          .followUp({
            content: `An unexpected error occurred. Please try again.`,
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
}

async function handleAddChannel(interaction, client, guildId, mainMessage) {
  const modal = new ModalBuilder()
    .setCustomId("autoreact_modal_add_channel")
    .setTitle("Add Channel Reaction")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("channelId")
          .setLabel("Channel ID or mention (#channel)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., 123456789012345678 or #general")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji")
          .setLabel("Emoji (Unicode or <:name:id>)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., 😄 or <:emoji:123456789012345678>")
          .setRequired(true)
          .setMaxLength(100)
      )
    );
  await interaction.showModal(modal);
  const modalSubmit = await interaction
    .awaitModalSubmit({
      filter: (m) => m.user.id === interaction.user.id,
      time: 60000,
    })
    .catch(() => null);
  if (modalSubmit) {
    try {
      await modalSubmit.deferUpdate();
      let channelId = modalSubmit.fields.getTextInputValue("channelId");
      const emoji = modalSubmit.fields.getTextInputValue("emoji");
      const channelMatch =
        channelId.match(/^<#(\d+)>$/) || channelId.match(/^(\d+)$/);
      if (channelMatch) {
        channelId = channelMatch[1];
      }
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        await modalSubmit.followUp({
          content: "Invalid channel ID or mention provided.",
          ephemeral: true,
        });
        return;
      }
      const existing = await AutoReact.findOne({
        guildId,
        channelId,
        keyword: null,
      });
      if (existing) {
        await modalSubmit.followUp({
          content: ` Channel reaction for <#${channelId}> already exists with emoji ${existing.emoji}`,
          ephemeral: true,
        });
        return;
      }
      await AutoReact.create({
        guildId,
        channelId,
        emoji,
        keyword: null,
        createdAt: new Date(),
      });
      await modalSubmit.followUp({
        content: ` Channel reaction enabled for <#${channelId}> with emoji ${emoji}`,
        ephemeral: true,
      });
      const updatedData = await AutoReact.find({ guildId });
      const container = createMainContainer(
        updatedData,
        interaction.guild,
        client
      );
      await mainMessage.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 10062) {
        console.error(
          "AutoReact interaction error: Modal submission timed out."
        );
        await interaction
          .followUp({
            content: `The modal submission timed out. Please try again.`,
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        console.error("Error handling channel modal submission:", error);
        await interaction
          .followUp({
            content: `An unexpected error occurred. Please try again.`,
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }
}

async function handleManage(interaction, client, guildId, mainMessage) {
  const autoReactData = await AutoReact.find({ guildId });
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Manage Reactions**\nRemove specific triggers or channel reactions"
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  const triggers = autoReactData.filter((e) => e.keyword);
  const channels = autoReactData.filter((e) => e.channelId && !e.keyword);
  if (triggers.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Keyword Triggers:** ${triggers.length} active`
      )
    );
  }
  if (channels.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Channel Reactions:** ${channels.length} active`
      )
    );
  }
  if (triggers.length === 0 && channels.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No reactions configured yet.")
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder());
  let rowCount = 0;
  if (triggers.length > 0 && rowCount < 5) {
    const triggerOptions = triggers.slice(0, 25).map((entry) => ({
      label: `${entry.keyword}`.slice(0, 100),
      description: `Emoji: ${entry.emoji}`.slice(0, 100),
      value: entry._id.toString(),
    }));
    const removeTriggerSelect = new StringSelectMenuBuilder()
      .setCustomId("remove_trigger_select")
      .setPlaceholder("Select a trigger to remove...")
      .addOptions(triggerOptions);
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(removeTriggerSelect)
    );
    rowCount++;
  }
  if (channels.length > 0 && rowCount < 5) {
    const channelOptions = channels.slice(0, 25).map((entry) => {
      const channel = interaction.guild.channels.cache.get(entry.channelId);
      return {
        label: `#${channel?.name || "Unknown"}`.slice(0, 100),
        description: `Emoji: ${entry.emoji}`.slice(0, 100),
        value: entry._id.toString(),
      };
    });
    const removeChannelSelect = new StringSelectMenuBuilder()
      .setCustomId("remove_channel_select")
      .setPlaceholder("Select a channel reaction to remove...")
      .addOptions(channelOptions);
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(removeChannelSelect)
    );
    rowCount++;
  }
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setEmoji(client.emoji.left)
      .setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(backRow);
  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleList(interaction, client, guildId) {
  const autoReactData = await AutoReact.find({ guildId });
  if (autoReactData.length === 0) {
    await interaction.reply({
      content: "No auto reactions found.",
      ephemeral: true,
    });
    return;
  }
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Auto-React Configuration List**\nAll configured reactions for this server"
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  const triggers = autoReactData.filter((e) => e.keyword);
  const channels = autoReactData.filter((e) => e.channelId && !e.keyword);
  if (triggers.length > 0) {
    const triggerList = triggers
      .map((e) => `• \`${e.keyword}\` → ${e.emoji}`)
      .join("\n");
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Keyword Triggers (${triggers.length}):**\n${triggerList}`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder());
  }
  if (channels.length > 0) {
    const channelList = channels
      .map((e) => `• <#${e.channelId}> → ${e.emoji}`)
      .join("\n");
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Channel Reactions (${channels.length}):**\n${channelList}`
      )
    );
  }
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    ephemeral: true,
  });
}

async function handleBack(interaction, client, guildId, mainMessage) {
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleRemoveTrigger(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const entryId = interaction.values[0];
  const removed = await AutoReact.findByIdAndDelete(entryId);
  await interaction.followUp({
    content: removed
      ? ` Removed trigger: **${removed.keyword}** → ${removed.emoji}`
      : `Trigger not found.`,
    ephemeral: true,
  });
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleRemoveChannel(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const entryId = interaction.values[0];
  const removed = await AutoReact.findByIdAndDelete(entryId);
  await interaction.followUp({
    content: removed
      ? ` Removed channel reaction: <#${removed.channelId}> → ${removed.emoji}`
      : `Channel reaction not found.`,
    ephemeral: true,
  });
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleResetTriggers(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const deletedCount = await AutoReact.deleteMany({
    guildId,
    keyword: { $ne: null },
  });
  await interaction.followUp({
    content: ` Removed ${deletedCount.deletedCount} keyword trigger(s).`,
    ephemeral: true,
  });
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleResetChannels(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const deletedCount = await AutoReact.deleteMany({ guildId, keyword: null });
  await interaction.followUp({
    content: `🧹 Removed ${deletedCount.deletedCount} channel reaction(s).`,
    ephemeral: true,
  });
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleResetAll(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const deletedCount = await AutoReact.deleteMany({ guildId });
  await interaction.followUp({
    content: `💥 Removed all ${deletedCount.deletedCount} auto-reaction(s).`,
    ephemeral: true,
  });
  const autoReactData = await AutoReact.find({ guildId });
  const container = createMainContainer(
    autoReactData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}
module.exports = {
  name: "autoreact",
  aliases: ["ar", "react"],
  category: "Automod",
  description: "Advanced Auto-React system with comprehensive management.",
  userPerms: ["ManageMessages"],
  botPerms: ["ManageMessages", "AddReactions", "ViewChannel"],
  args: false,
  cooldown: 3,
  execute: async (message, args, client) => {
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;
      const autoReactData = await AutoReact.find({ guildId });
      const container = createMainContainer(
        autoReactData,
        message.guild,
        client
      );
      const mainMessage = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
      const collector = mainMessage.createMessageComponentCollector({
        time: 300000,
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
            guildId,
            mainMessage
          );
        } catch (error) {
          console.error("AutoReact interaction error:", error);
          const errorContainer = new ContainerBuilder();
          errorContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**Error**\nAn error occurred while processing your request.`
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
      collector.on("end", async (collected, reason) => {
        try {
          const disabledContainer = createDisabledContainer(reason, client);
          await mainMessage
            .edit({
              flags: MessageFlags.IsComponentsV2,
              components: disabledContainer,
            })
            .catch(() => {});
        } catch (error) {
          console.error("Error disabling components:", error);
        }
      });
    } catch (error) {
      console.error("AutoReact command error:", error);
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**System Error**\nFailed to initialize the Auto-React system.`
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
