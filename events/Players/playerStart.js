const {
  WebhookClient,
  EmbedBuilder,
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Preset = require("@data/preset");
const path = require("node:path");
const VcStatus = require("@data/vcstatus");
const fs = require("node:fs");

// Button and Filter Helper Functions
function createButtonRow(paused, client) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(paused ? "resume" : "pause")
      .setLabel(paused ? "Resume" : "Pause")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("skip")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("stop")
      .setLabel("Stop")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("loop")
      .setLabel("Loop")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("shuffle")
      .setLabel("Shuffle")
      .setStyle(ButtonStyle.Secondary)
  );
  return row;
}

function createFilterRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("disable_h")
      .setPlaceholder("Select Filters")
      .addOptions([
        { label: "Reset Filters", value: "clearbut" },
        { label: "BassBoost", value: "bassbut" },
        { label: "8D", value: "8dbut" },
        { label: "NightCore", value: "nightbut" },
        { label: "Pitch", value: "pitchbut" },
        { label: "Lofi", value: "lofibut" },
        { label: "Distort", value: "distortbut" },
        { label: "Speed", value: "speedbut" },
        { label: "Vaporwave", value: "vapobut" },
      ])
  );
}

function getFilterSettings(guildId, value) {
  const filters = {
    clearbut: { op: "filters", guildId },
    bassbut: {
      op: "filters",
      guildId,
      equalizer: Array(14)
        .fill({})
        .map((_, i) => ({ band: i, gain: i < 2 || i > 11 ? 0.1 : -0.05 })),
    },
    "8dbut": {
      op: "filters",
      guildId,
      rotation: { rotationHz: 0.2 },
    },
    nightbut: {
      op: "filters",
      guildId,
      equalizer: [
        { band: 1, gain: 0.3 },
        { band: 0, gain: 0.3 },
      ],
      timescale: { pitch: 1.2 },
      tremolo: { depth: 0.3, frequency: 14 },
    },
    pitchbut: {
      op: "filters",
      guildId,
      timescale: { pitch: 1.245, rate: 1.921 },
    },
    lofibut: {
      op: "filters",
      guildId,
      equalizer: Array(14)
        .fill({})
        .map((_, i) => ({
          band: i,
          gain: i <= 4 ? -0.25 + i * 0.05 : (i - 5) * 0.05,
        })),
    },
    distortbut: {
      op: "filters",
      guildId,
      equalizer: Array(14)
        .fill({})
        .map((_, i) => ({ band: i, gain: 0.5 - i * 0.05 })),
    },
    speedbut: {
      op: "filters",
      guildId,
      timescale: { speed: 1.501, pitch: 1.245, rate: 1.921 },
    },
    vapobut: {
      op: "filters",
      guildId,
      equalizer: [
        { band: 1, gain: 0.3 },
        { band: 0, gain: 0.3 },
      ],
      timescale: { pitch: 0.5 },
      tremolo: { depth: 0.3, frequency: 14 },
    },
  };
  return filters[value] || null;
}

// Main Module Export
module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const webhook = new WebhookClient({
      url: client.config.Webhooks.player_create,
    });

    await webhook.send({
      embeds: [
        new EmbedBuilder()
          .setColor(client.color)
          .setAuthor({
            name: `Player Started`,
            iconURL: client.user.displayAvatarURL(),
          })
          .setDescription(
            `**Server ID:** ${guild.id}\n**Server Name:** ${guild.name}\n**Req:** ${track.requester.username}`
          ),
      ],
    });

    const presetDoc = await Preset.findOne({ userId: track.requester.id });
    const cardPath = presetDoc?.cardPath || "../../custom/presets/card2.js";
    const resolvedCardPath = path.resolve(__dirname, cardPath);
    const guildId = guild.id;
    const x = await VcStatus.findOne({ guildId });
    const title = client.cleanTitle(track.title).slice(0, 30);

    const auth = track.author;
    const total = track.length;
    const thumb = track.thumbnail.replace("hqdefault", "maxresdefault");
    const req = track.requester.username;
    const ok = client.tracktime(total);
    const startedAt = Date.now();
    const iconn = client.emoji[track.sourceName]

    if (x) {
      client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `${iconn} **${title}**` },
        })
        .catch(() => null);
    }

    let cardBuffer;
    let buildCard;

    try {
      if (fs.existsSync(resolvedCardPath)) {
        buildCard = require(resolvedCardPath);
        cardBuffer = await buildCard({
          title,
          author: auth,
          thumbnail: thumb,
          startTime: "0:00",
          endTime: ok,
          requester: req,
          progressPercent: 0,
          source: track.sourceName,
        });
      } else {
        throw new Error("Card file not found.");
      }
    } catch (err) {
      console.error("Card load error:", err);
      return client.channels.cache.get(player.textId)?.send({
        content: "❌ Failed to load player card.",
      });
    }

    const attachment = new AttachmentBuilder(cardBuffer, {
      name: "nowplaying.png",
    });

    const me = client.box().media("attachment://nowplaying.png").sep();
    me.addActionRowComponents(
      createFilterRow(),
      createButtonRow(false, client)
    );
    const msg = await client.channels.cache
      .get(player.textId)
      .send({
        flags: MessageFlags.IsComponentsV2,
        files: [attachment],
        components: [me],
      })
      .catch(() => null);

    const updateInterval = setInterval(async () => {
      if (!player || !player.playing) return clearInterval(updateInterval);

      const elapsed = Date.now() - startedAt;
      const progress = Math.min((elapsed / total) * 100, 100);
      const currentTimeFormatted = client.tracktime(elapsed);
      const durationFormatted = client.tracktime(total);

      try {
        const updatedCard = await buildCard({
          title,
          author: auth,
          thumbnail: thumb,
          startTime: currentTimeFormatted,
          endTime: durationFormatted,
          requester: req,
          progressPercent: progress,
          source: track.sourceName,
        });

        const updatedAttachment = new AttachmentBuilder(updatedCard, {
          name: "nowplaying.png",
        });

        const time = client.box().media("attachment://nowplaying.png").sep();
        time.addActionRowComponents(
          createFilterRow(),
          createButtonRow(false, client)
        );
        await msg.edit({
          flags: MessageFlags.IsComponentsV2,
          files: [updatedAttachment],
          components: [time],
        });

        if (progress >= 100) clearInterval(updateInterval);
      } catch (err) {
        clearInterval(updateInterval);
      }
    }, 20000);

    player.data.set("message", msg);

    const collector = msg.createMessageComponentCollector({
      time: track.duration,
      componentType: ComponentType.MessageComponent,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.member.voice.channelId !== player.voiceId) {
        return interaction.reply({
          content: `${client.emoji.cross} | You must be in the same voice channel.`,
          ephemeral: true,
        });
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case "pause":
            player.pause(true);
            const pausedAttachment = new AttachmentBuilder(cardBuffer, {
              name: "nowplaying.png",
            });
            const pausedBox = client.box().media("attachment://nowplaying.png").sep();
            pausedBox.addActionRowComponents(
              createFilterRow(),
              createButtonRow(true, client)
            );
            await interaction.update({
              flags: MessageFlags.IsComponentsV2,
              files: [pausedAttachment],
              components: [pausedBox],
            });
            break;

          case "resume":
            player.pause(false);
            const resumedAttachment = new AttachmentBuilder(cardBuffer, {
              name: "nowplaying.png",
            });
            const resumedBox = client.box().media("attachment://nowplaying.png").sep();
            resumedBox.addActionRowComponents(
              createFilterRow(),
              createButtonRow(false, client)
            );
            await interaction.update({
              flags: MessageFlags.IsComponentsV2,
              files: [resumedAttachment],
              components: [resumedBox],
            });
            break;

          case "skip":
            player.skip();
            await interaction.reply({
              content: `${client.emoji.skip} | Skipped the track.`,
              ephemeral: true,
            });
            clearInterval(updateInterval);
            break;

          case "stop":
            player.queue.clear();
            player.destroy();
            await client.rest
              .put(`/channels/${player.voiceId}/voice-status`, {
                body: { status: `` },
              })
              .catch(() => null);
            clearInterval(updateInterval);
            await interaction.reply({
              content: `${client.emoji.stop} | Stopped the music.`,
              ephemeral: true,
            });
            break;

          case "loop":
            player.setLoop(player.loop === "none" ? "track" : "none");
            await interaction.reply({
              content: `🔁 | Loop **${player.loop === "none" ? "off" : "on"}**`,
              ephemeral: true,
            });
            break;

          case "shuffle":
            player.queue.shuffle();
            await interaction.reply({
              content: `🔀 | Queue shuffled`,
              ephemeral: true,
            });
            break;
        }
      } else if (interaction.isStringSelectMenu()) {
        const filterPayload = getFilterSettings(
          interaction.guild.id,
          interaction.values[0]
        );
        if (!filterPayload) return;

        await interaction.deferReply({ ephemeral: true });
        await player.shoukaku.setFilters(filterPayload);
        await interaction.editReply({
          content: ` | Applied filter: **${interaction.values[0].replace("but", "")}**`,
        });
      }
    });
  },
};