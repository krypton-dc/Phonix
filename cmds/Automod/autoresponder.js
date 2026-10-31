const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
const Autoresponder = require("@data/autoresponder");
const moment = require("moment");

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

function createMainContainer(autoresponderData, guild, client) {
  const container = new ContainerBuilder();
  const totalCount = autoresponderData.length;
  const isEnabled = totalCount > 0;
  const statusText = isEnabled ? client.emoji.tick : client.emoji.cross;
  let lastUpdated = "Never";
  if (autoresponderData.length > 0) {
    const mostRecentEntry = autoresponderData.reduce((prev, current) => {
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
    lastUpdated = moment(mostRecentEntry.createdAt).format(
      "MMMM Do YYYY, h:mm:ss a"
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# **Autoresponder System**\nAutomatic text replies for specific keyword triggers.`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **System Status:** ${statusText}`)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`> **Total Triggers:** ${totalCount}`)
  );
  container.addSeparatorComponents(new SeparatorBuilder());
  if (totalCount > 0) {
    const triggerPreview = autoresponderData
      .slice(0, 5)
      .map(
        (e) =>
          `- \`${e.trigger}\` → \`${
            e.response.length > 50
              ? e.response.substring(0, 50) + "..."
              : e.response
          }\``
      )
      .join("\n");
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Recent Triggers:**\n${triggerPreview}${
          totalCount > 5 ? `\n*...and ${totalCount - 5} more*` : ""
        }`
      )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`No autoresponders configured yet.`)
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder());

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_add")
      .setLabel("Add Trigger")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ar_manage")
      .setLabel("Manage Triggers")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(totalCount === 0),
    new ButtonBuilder()
      .setCustomId("ar_list")
      .setLabel("View All")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(totalCount === 0)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_reset")
      .setLabel("Reset All")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(totalCount === 0)
  );

  container.addActionRowComponents(row1, row2);
  container.addSeparatorComponents(new SeparatorBuilder());
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Total Triggers: ${totalCount} | Last updated: ${lastUpdated}`
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
    case "ar_add":
      await handleAdd(interaction, client, guildId, mainMessage);
      break;
    case "ar_manage":
      await handleManage(interaction, client, guildId, mainMessage);
      break;
    case "ar_list":
      await handleList(interaction, client, guildId);
      break;
    case "ar_reset":
      await handleReset(interaction, client, guildId, mainMessage);
      break;
    case "ar_back":
      await handleBack(interaction, client, guildId, mainMessage);
      break;
    case "remove_select":
      await handleRemove(interaction, client, guildId, mainMessage);
      break;
  }
}

async function handleAdd(interaction, client, guildId, mainMessage) {
  const modal = new ModalBuilder()
    .setCustomId("autoresponder_modal_add")
    .setTitle("Add Autoresponder Trigger")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("trigger")
          .setLabel("Trigger Word/Phrase")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., hello, what's up")
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("response")
          .setLabel("Response Message")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("e.g., Hello there! I'm a bot.")
          .setRequired(true)
          .setMaxLength(1000)
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
      const trigger = modalSubmit.fields
        .getTextInputValue("trigger")
        .toLowerCase();
      const response = modalSubmit.fields.getTextInputValue("response");

      const existing = await Autoresponder.findOne({ guildId, trigger });
      if (existing) {
        await modalSubmit.followUp({
          content: `Trigger for **${trigger}** already exists!`,
          ephemeral: true,
        });
        return;
      }

      const totalTriggers = await Autoresponder.countDocuments({ guildId });
      if (totalTriggers >= 50) {
        return await modalSubmit.followUp({
          content: "Maximum autoresponder limit (50) reached for this server!",
          ephemeral: true,
        });
      }

      await Autoresponder.create({
        guildId,
        trigger,
        response,
        createdAt: new Date(),
      });

      await modalSubmit.followUp({
        content: ` Added autoresponder for **${trigger}** → \`${response}\``,
        ephemeral: true,
      });

      const updatedData = await Autoresponder.find({ guildId });
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
          "Autoresponder interaction error: Modal submission timed out."
        );
      } else {
        console.error("Error handling modal submission:", error);
      }
      await interaction
        .followUp({
          content: `An unexpected error occurred. Please try again.`,
          ephemeral: true,
        })
        .catch(() => {});
    }
  }
}

async function handleManage(interaction, client, guildId, mainMessage) {
  const autoresponderData = await Autoresponder.find({ guildId });
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Manage Autoresponders**\nSelect a trigger to remove."
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());

  if (autoresponderData.length > 0) {
    const options = autoresponderData.slice(0, 25).map((entry) => ({
      label: `${entry.trigger}`.slice(0, 100),
      description: `Response: ${entry.response}`.slice(0, 100),
      value: entry._id.toString(),
    }));
    const removeSelect = new StringSelectMenuBuilder()
      .setCustomId("remove_select")
      .setPlaceholder("Select a trigger to remove...")
      .addOptions(options);
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(removeSelect)
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No autoresponders to manage.")
    );
  }

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ar_back")
      .setEmoji(client.emoji.left || "⬅️")
      .setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(backRow);

  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleList(interaction, client, guildId) {
  const autoresponderData = await Autoresponder.find({ guildId });
  if (autoresponderData.length === 0) {
    await interaction.reply({
      content: "No autoresponders found.",
      ephemeral: true,
    });
    return;
  }
  const container = new ContainerBuilder();
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "**Autoresponder Configuration List**\nAll configured triggers for this server"
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder());

  const triggerList = autoresponderData
    .map((e) => `• \`${e.trigger}\` → \`${e.response}\``)
    .join("\n");
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(triggerList)
  );

  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    ephemeral: true,
  });
}

async function handleBack(interaction, client, guildId, mainMessage) {
  const autoresponderData = await Autoresponder.find({ guildId });
  const container = createMainContainer(
    autoresponderData,
    interaction.guild,
    client
  );
  await interaction.update({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleRemove(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const entryId = interaction.values[0];
  const removed = await Autoresponder.findByIdAndDelete(entryId);
  await interaction.followUp({
    content: removed
      ? ` Removed trigger: **${removed.trigger}**`
      : `Trigger not found.`,
    ephemeral: true,
  });
  const autoresponderData = await Autoresponder.find({ guildId });
  const container = createMainContainer(
    autoresponderData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

async function handleReset(interaction, client, guildId, mainMessage) {
  await interaction.deferUpdate();
  const deletedCount = await Autoresponder.deleteMany({ guildId });
  await interaction.followUp({
    content: `💥 Removed all ${deletedCount.deletedCount} autoresponder(s).`,
    ephemeral: true,
  });
  const autoresponderData = await Autoresponder.find({ guildId });
  const container = createMainContainer(
    autoresponderData,
    interaction.guild,
    client
  );
  await mainMessage.edit({
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  });
}

module.exports = {
  name: "autoresponder",
  aliases: ["ar", "respond"],
  category: "Automod",
  description: "Advanced Autoresponder system with comprehensive management.",
  userPerms: ["ManageMessages"],
  botPerms: ["SendMessages", "EmbedLinks"],
  args: false,
  cooldown: 3,
  execute: async (message, args, client) => {
    try {
      const guildId = message.guild.id;
      const userId = message.author.id;
      const autoresponderData = await Autoresponder.find({ guildId });
      const container = createMainContainer(
        autoresponderData,
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
          console.error("Autoresponder interaction error:", error);
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
        console.log(
          `Autoresponder interface ended: ${reason} (${collected.size} interactions)`
        );
      });
    } catch (error) {
      console.error("Autoresponder command error:", error);
      const errorContainer = new ContainerBuilder();
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**System Error**\nFailed to initialize the Autoresponder system.`
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
