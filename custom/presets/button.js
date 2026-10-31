const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function createButtonRow(paused) {
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

module.exports = {
  createButtonRow,
  createFilterRow,
  getFilterSettings,
};
