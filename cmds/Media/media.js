const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const MediaChannel = require("@data/mediachannel");

const MAX_MEDIA_CHANNELS = 5;

/* -------------------- DB -------------------- */

async function getDoc(guildId) {
  let doc = await MediaChannel.findOne({ guildId });
  if (!doc) doc = await MediaChannel.create({ guildId, channels: [] });
  if (!Array.isArray(doc.channels)) doc.channels = [];
  return doc;
}

/* -------------------- UI -------------------- */

function actionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mc_add")
      .setLabel("Add Channel")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("mc_remove")
      .setLabel("Remove Channel")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("mc_list")
      .setLabel("List")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("mc_clear")
      .setLabel("Clear All")
      .setStyle(ButtonStyle.Danger)
  );
}

function baseContainer(doc) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent("# Media-Only Channels"),
    new TextDisplayBuilder().setContent(
      "> Only messages containing attachments are allowed in selected channels."
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Configured: ${doc.channels.length}/${MAX_MEDIA_CHANNELS}`
    )
  );

  container.addActionRowComponents(actionRow());
  return container;
}

function infoContainer(title, body) {
  const container = new ContainerBuilder();

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${title}`),
    new TextDisplayBuilder().setContent(body)
  );

  container.addActionRowComponents(actionRow());
  return container;
}

/* -------------------- COMMAND -------------------- */

module.exports = {
  name: "mediachannel",
  category: "Media",
  userPerms: ["Administrator"],
  cooldown: 3,

  execute: async (message) => {
    const doc = await getDoc(message.guild.id);

    const panel = await message.channel.send({
      components: [baseContainer(doc)],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = panel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      /* ---------- LIST ---------- */
      if (i.customId === "mc_list") {
        const list = doc.channels.length
          ? doc.channels.map((id) => `- <#${id}>`).join("\n")
          : "-# No media-only channels configured.";

        return panel.edit({
          components: [infoContainer("Configured Channels", list)],
        });
      }

      /* ---------- CLEAR ---------- */
      if (i.customId === "mc_clear") {
        doc.channels = [];
        await doc.save();

        return panel.edit({
          components: [
            infoContainer(
              "Configuration Reset",
              "- All media-only channels have been cleared."
            ),
          ],
        });
      }

      /* ---------- ADD ---------- */
      if (i.customId === "mc_add") {
        await panel.edit({
          components: [
            infoContainer(
              "Add Media-Only Channel",
              "> Mention a text channel to add.\n-# You have 60 seconds."
            ),
          ],
        });

        const collected = await message.channel
          .awaitMessages({
            filter: (m) =>
              m.author.id === message.author.id && m.mentions.channels.size > 0,
            max: 1,
            time: 60_000,
          })
          .catch(() => null);

        if (!collected) {
          return panel.edit({
            components: [
              infoContainer(
                "Add Media-Only Channel",
                "-# Timed out. No channel mentioned."
              ),
            ],
          });
        }

        const channel = collected.first().mentions.channels.first();
        collected
          .first()
          .delete()
          .catch(() => {});

        if (doc.channels.includes(channel.id)) {
          return panel.edit({
            components: [
              infoContainer(
                "Add Media-Only Channel",
                `-# ${channel} is already configured.`
              ),
            ],
          });
        }

        if (doc.channels.length >= MAX_MEDIA_CHANNELS) {
          return panel.edit({
            components: [
              infoContainer(
                "Add Media-Only Channel",
                `-# Limit reached (${MAX_MEDIA_CHANNELS}).`
              ),
            ],
          });
        }

        doc.channels.push(channel.id);
        await doc.save();

        return panel.edit({
          components: [
            infoContainer(
              "Channel Added",
              `- ${channel} has been added as media-only.`
            ),
          ],
        });
      }

      /* ---------- REMOVE (NORMAL SYSTEM) ---------- */
      if (i.customId === "mc_remove") {
        await panel.edit({
          components: [
            infoContainer(
              "Remove Media-Only Channel",
              "> Mention a configured channel to remove.\n-# You have 60 seconds."
            ),
          ],
        });

        const collected = await message.channel
          .awaitMessages({
            filter: (m) =>
              m.author.id === message.author.id && m.mentions.channels.size > 0,
            max: 1,
            time: 60_000,
          })
          .catch(() => null);

        if (!collected) {
          return panel.edit({
            components: [
              infoContainer(
                "Remove Media-Only Channel",
                "-# Timed out. No channel mentioned."
              ),
            ],
          });
        }

        const channel = collected.first().mentions.channels.first();
        collected
          .first()
          .delete()
          .catch(() => {});

        if (!doc.channels.includes(channel.id)) {
          return panel.edit({
            components: [
              infoContainer(
                "Remove Media-Only Channel",
                `-# ${channel} is not configured as media-only.`
              ),
            ],
          });
        }

        doc.channels = doc.channels.filter((id) => id !== channel.id);
        await doc.save();

        return panel.edit({
          components: [
            infoContainer(
              "Channel Removed",
              `- ${channel} has been removed from media-only channels.`
            ),
          ],
        });
      }
    });
  },
};
