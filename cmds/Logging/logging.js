const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const { LoggingSetup } = require("@data/logging.js");

module.exports = {
  name: "logging",
  category: "Logging",
  aliases: ["log"],
  cooldown: 3,
  description: "Setup and manage the server logging system",
  userPerms: ["Administrator"],
  botPerms: ["Administrator"],

  execute: async (message, args, client) => {
    const sub = args[0];
    const guild = message.guild;
    const emoji = client.emoji;

    const logTypes = [
      { label: "Server Logs", value: "serverLogs"}
    ];

const eventsByType = {
  serverLogs: [
    { name: "Member Join / Leave", key: "memberJoinLeave" },
    { name: "Channel Changes", key: "channelChanges" },
    { name: "Role Changes", key: "roleChanges" },
    { name: "Voice State", key: "voiceState" },
    { name: "Emoji Changes", key: "emojiChanges" },
    { name: "Guild Update", key: "guildUpdate" },
    { name: "Member Update", key: "memberUpdate" },
    { name: "Message Logs", key: "messageLogs" },
    { name: "Moderation Actions", key: "moderationActions" },
  ],
};

    switch (sub) {
      case "setup": {
        const existing = await LoggingSetup.findOne({ Guild: guild.id });
        const container = client.box()
          .text(
            `${emoji.cat} **Logging Setup**\nSelect which type of logs you want to setup.\nAfter that, you'll choose which specific events to track.`
          );

        const logTypeSelect = new StringSelectMenuBuilder()
          .setCustomId("select_log_type")
          .setPlaceholder("Select a log category to setup")
          .addOptions(
            logTypes.map((t) => ({
              label: t.label,
              description: `Setup ${t.label}`,
              value: t.value,
              emoji: t.emoji,
            }))
          );

          const bb = new ActionRowBuilder().setComponents([logTypeSelect])
        container.addActionRowComponents([bb]);


        const msg = await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        const collector = msg.createMessageComponentCollector({
          time: 90000,
        });

        collector.on("collect", async (interaction) => {
          if (interaction.user.id !== message.author.id) {
            return interaction.reply({
              content: `${emoji.warn} You cannot interact with this setup.`,
              ephemeral: true,
            });
          }

          if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "select_log_type") {
              const type = interaction.values[0];
              const events = eventsByType[type];

              if (!events) {
                return interaction.reply({
                  content: `${emoji.warn} Unknown log type.`,
                  ephemeral: true,
                });
              }

              const eventContainer = client.box()
                .text(
                  `${emoji.server} **${logTypes.find(
                    (t) => t.value === type
                  ).label}**\nSelect which events you want to log for this category.`
                );

              const eventOptions = events.map((ev) => ({
                label: ev.name,
                description: `Track ${ev.name}`,
                value: ev.key,
              }));
              eventOptions.push({
                label: "All Events",
                description: `Track all events in ${logTypes.find(
                  (t) => t.value === type
                ).label}`,
                value: "all",
              });

              const eventSelect = new StringSelectMenuBuilder()
                .setCustomId(`select_log_events_${type}`)
                .setPlaceholder("Select events...")
                .setMinValues(1)
                .setMaxValues(eventOptions.length)
                .addOptions(eventOptions);

                const g = new ActionRowBuilder().setComponents([eventSelect])
              eventContainer.addActionRowComponents([g]);

              await interaction.update({
                components: [eventContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            } else if (interaction.customId.startsWith("select_log_events_")) {
              const type = interaction.customId.replace(
                "select_log_events_",
                ""
              );
              let selectedEvents = interaction.values;
              if (selectedEvents.includes("all")) {
                selectedEvents = eventsByType[type].map((e) => e.key);
              }

              await interaction.deferUpdate();

              await interaction.followUp({
                content: `${emoji.loading} Creating channels for selected events...`,
                ephemeral: true,
              });

              const createdChannels = {};
              let category;
              try {
                category = await guild.channels.create({
                  name: `${logTypes.find((t) => t.value === type).label}`,
                  type: ChannelType.GuildCategory,
                });
              } catch (err) {
                return interaction.followUp({
                  content: `${emoji.warn} Error creating category channel: ${err.message}`,
                  ephemeral: true,
                });
              }

              for (const evKey of selectedEvents) {
                const ev = Object.values(eventsByType)
                  .flat()
                  .find((e) => e.key === evKey);
                if (!ev) continue;

                try {
                  const ch = await guild.channels.create({
                    name: ev.name.toLowerCase().replace(/\s+/g, "-"),
                    type: ChannelType.GuildText,
                    parent: category.id,
                  });
                  createdChannels[ev.key] = ch.id;
                } catch (err) {
                  console.error(`Failed to create channel for ${ev.name}:`, err);
                }
              }

              try {
                await LoggingSetup.findOneAndUpdate(
                  { Guild: guild.id },
                  {
                    Guild: guild.id,
                    Enabled: true,
                    $set: { [`Types.${type}`]: createdChannels },
                  },
                  { upsert: true }
                );
              } catch (err) {
                return interaction.followUp({
                  content: `${emoji.warn} Error updating logging setup in database: ${err.message}`,
                  ephemeral: true,
                });
              }

              const doneContainer = client
                .box()
                .text(
                  `${emoji.tick} Logging Setup Complete!\n` +
                    Object.entries(createdChannels)
                      .map(([key, id]) => {
                        const name = Object.values(eventsByType)
                          .flat()
                          .find((e) => e.key === key)?.name;
                        return `${emoji.dot} **${name}** → <#${id}>`;
                      })
                      .join("\n")
                );

              await interaction.editReply({
                components: [doneContainer],
                flags: MessageFlags.IsComponentsV2,
              });

              collector.stop();
            }
          }
        });

        collector.on("end", (_collected, reason) => {
          if (reason !== "user") {
            msg.edit({
              components: [],
              embeds: [
                new EmbedBuilder().setDescription(
                  `${emoji.warn} Logging setup timed out.`
                ),
              ],
            }).catch(() => {});
          }
        });

        break;
      }

      case "config": {
        const data = await LoggingSetup.findOne({ Guild: guild.id });
        if (!data?.Enabled) {
          return message.reply({
            components: [
              client.box().text(`${emoji.warn} Logging is not enabled.`),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        let desc = "";
        for (const [type, events] of Object.entries(data.Types || {})) {
          const typeLabel =
            logTypes.find((t) => t.value === type)?.label || type;
          desc += `**${emoji.folder} ${typeLabel}**\n`;
          for (const [key, id] of Object.entries(events)) {
            const name = Object.values(eventsByType)
              .flat()
              .find((e) => e.key === key)?.name;
            desc += `${emoji.enabled} **${name}** → <#${id}>\n`;
          }
          desc += "\n";
        }

        const statsContainer = client
          .box()
          .text(
            `${guild.name} - Logging Configuration\n` + (desc || `${emoji.warn} No logging categories configured yet.`)
          );

        return message.reply({
          components: [statsContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      case "reset": {
        const data = await LoggingSetup.findOne({ Guild: guild.id });
        if (!data?.Enabled) {
          return message.reply({
            components: [
              client.box().text(`${emoji.warn} Logging is not enabled.`),
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        const resettingContainer = client
          .box()
          .text(`${emoji.loading} Resetting all logging categories...`);

        const msg = await message.reply({
          components: [resettingContainer],
          flags: MessageFlags.IsComponentsV2,
        });

        for (const type of Object.values(data.Types || {})) {
          for (const chId of Object.values(type)) {
            const ch = guild.channels.cache.get(chId);
            if (ch) {
              try {
                await ch.delete();
              } catch {}
            }
          }
        }
          if (data.Categories) {
    for (const catId of Object.values(data.Categories)) {
      const cat = guild.channels.cache.get(catId);
      if (cat) {
        try {
          await cat.delete();
        } catch {}
      }
    }
  }

        await LoggingSetup.deleteOne({ Guild: guild.id });

        const doneContainer = client
          .box()
          .text(`${emoji.tick} All logging categories have been reset.`);

        await msg.edit({ components: [doneContainer], flags: MessageFlags.IsComponentsV2 });

        break;
      }

      default:
        message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `${emoji.warn} Invalid subcommand! Available: \`setup\`, \`config\`, \`reset\``
              ),
          ],
        });
    }
  },
};
