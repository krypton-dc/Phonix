const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  name: "filter",
  category: "Music",
  aliases: ["eq", "filters"],
  cooldown: 3,
  description: "Sets the bot's sound filter.",
  args: false,
  usage: "",
  userPerms: [],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
      const box = client.box();
      box.text(`Choose Filters From below!`)
    const row4 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("disable_h")
        .setPlaceholder(`Select Filters`)
        .addOptions([
          { label: "Reset Filters", value: "clear", emoji: client.emoji.dot },
          { label: "Bass", value: "bass_but", emoji: client.emoji.dot },
          {
            label: "BassBoost",
            value: "bassboost_but",
            emoji: client.emoji.dot,
          },
          {
            label: "TrebleBass",
            value: "treblebass_but",
            emoji: client.emoji.dot,
          },
          { label: "S&R", value: "s&r_but", emoji: client.emoji.dot },
          { label: "Enhance", value: "enhance_but", emoji: client.emoji.dot },
          { label: "Earrape", value: "earrape_but", emoji: client.emoji.dot },
          { label: "8D", value: "8d_but", emoji: client.emoji.dot },
          { label: "NightCore", value: "night_but", emoji: client.emoji.dot },
          { label: "Pitch", value: "pitch_but", emoji: client.emoji.dot },
          { label: "Distort", value: "distort_but", emoji: client.emoji.dot },
          { label: "Equalizer", value: "eq_but", emoji: client.emoji.dot },
          { label: "Speed", value: "speed_but", emoji: client.emoji.dot },
          { label: "Vaporwave", value: "vapo_but", emoji: client.emoji.dot },
          { label: "Lofi", value: "lofi_but", emoji: client.emoji.dot },
        ])
    );
      box.addActionRowComponents(row4)

    const eq = await message.channel.send({
      components: [box], flags: MessageFlags.IsComponentsV2
    });

    const collector = await eq.createMessageComponentCollector({
      filter: (i) => {
        if (message.author.id === i.user.id) return true;
        else {
          i.reply({
            content: `${client.emoji.cross} | That's not your session run : \`${prefix}filter\` to create your own.`,
            ephemeral: true,
          });
        }
      },
      time: 100000,
    });

    collector.on("collect", async (i) => {
      if (i.isStringSelectMenu()) {
        for (const value of i.values) {
          if (value === "clear") {
            player.shoukaku.clearFilters();
            return i.reply({
              content: `${client.emoji.tick} Succesfully Cleared All **FILTERS**`,
              flags: MessageFlags.Ephemeral,
            });
          }
          if (value === "bass_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                {
                  band: 0,
                  gain: 0.6,
                },
                {
                  band: 1,
                  gain: 0.67,
                },
                {
                  band: 2,
                  gain: 0.67,
                },
                {
                  band: 3,
                  gain: 0,
                },
                {
                  band: 4,
                  gain: -0.5,
                },
                {
                  band: 5,
                  gain: 0.15,
                },
                {
                  band: 6,
                  gain: -0.45,
                },
                {
                  band: 7,
                  gain: 0.23,
                },
                {
                  band: 8,
                  gain: 0.35,
                },
                {
                  band: 9,
                  gain: 0.45,
                },
                {
                  band: 10,
                  gain: 0.55,
                },
                {
                  band: 11,
                  gain: 0.6,
                },
                {
                  band: 12,
                  gain: 0.55,
                },
                {
                  band: 13,
                  gain: 0,
                },
              ],
            });
            await i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Bass mode **ENABLED**`,
            });
          }
          if (value === "bassboost_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                {
                  band: 0,
                  gain: 0.8,
                },
                {
                  band: 1,
                  gain: 0.8,
                },
                {
                  band: 2,
                  gain: 0.5,
                },
                {
                  band: 3,
                  gain: 0.2,
                },
                {
                  band: 4,
                  gain: -0.2,
                },
                {
                  band: 5,
                  gain: -0.1,
                },
                {
                  band: 6,
                  gain: 0,
                },
                {
                  band: 7,
                  gain: 0.1,
                },
                {
                  band: 8,
                  gain: 0.2,
                },
                {
                  band: 9,
                  gain: 0.3,
                },
                {
                  band: 10,
                  gain: 0.4,
                },
                {
                  band: 11,
                  gain: 0.5,
                },
                {
                  band: 12,
                  gain: 0.4,
                },
                {
                  band: 13,
                  gain: 0.2,
                },
              ],
            });
            await i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} BassBoost mode **ENABLED**`,
            });
          }
          if (value === "treblebass_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.22 },
                { band: 1, gain: 0.18 },
                { band: 2, gain: 0.12 },
                { band: 3, gain: 0.05 },
                { band: 4, gain: -0.08 },
                { band: 5, gain: -0.05 },
                { band: 6, gain: 0.08 },
                { band: 7, gain: 0.12 },
                { band: 8, gain: 0.15 },
                { band: 9, gain: 0.18 },
                { band: 10, gain: 0.22 },
                { band: 11, gain: 0.25 },
                { band: 12, gain: 0.22 },
                { band: 13, gain: 0.15 },
                { band: 14, gain: 0.08 },
              ],
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} TrebleBass Mode **ENABLED**`,
            });
          }
          if (value === "earrape_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 1.0 }, // Extreme bass
                { band: 1, gain: 1.0 },
                { band: 2, gain: 0.5 },
                { band: 3, gain: 0.3 },
                { band: 4, gain: 0.2 },
                { band: 5, gain: 0.15 },
                { band: 6, gain: 0.1 },
                { band: 7, gain: 0.1 },
                { band: 8, gain: 0.15 },
                { band: 9, gain: 0.2 },
                { band: 10, gain: 0.25 },
                { band: 11, gain: 0.3 },
                { band: 12, gain: 0.4 },
                { band: 13, gain: 0.45 },
                { band: 14, gain: 0.5 },
              ],
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Earrape Mode **ENABLED**`,
            });
          }
          if (value === "s&r_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.15 },
                { band: 1, gain: 0.12 },
                { band: 2, gain: 0.07 },
                { band: 3, gain: 0.02 },
                { band: 4, gain: -0.1 },
                { band: 5, gain: -0.18 },
                { band: 6, gain: -0.19 },
                { band: 7, gain: -0.18 },
                { band: 8, gain: -0.05 },
                { band: 9, gain: 0 },
                { band: 10, gain: 0.08 },
                { band: 11, gain: 0.16 },
                { band: 12, gain: 0.24 },
                { band: 13, gain: 0.21 },
                { band: 14, gain: 0.15 },
              ],
              timescale: {
                speed: 0.8,
                pitch: 0.9,
                rate: 0.9,
              },
              reverb: {
                wetLevel: 0.5,
                roomSize: 0.8,
                damping: 0.2,
              },
              volume: 1.0,
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Slowed & Reverb Mode **ENABLED**`,
            });
          }
          if (value === "enhance_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.18 },
                { band: 1, gain: 0.16 },
                { band: 2, gain: 0.12 },
                { band: 3, gain: 0 },
                { band: 4, gain: -0.07 },
                { band: 5, gain: -0.1 },
                { band: 6, gain: -0.1 },
                { band: 7, gain: 0 },
                { band: 8, gain: 0.11 },
                { band: 9, gain: 0.15 },
                { band: 10, gain: 0.22 },
                { band: 11, gain: 0.13 },
                { band: 12, gain: 0.14 },
                { band: 13, gain: 0.18 },
                { band: 14, gain: 0.22 },
              ],
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Enhance Mode **ENABLED**`,
            });
          }
          if (value === "8d_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              rotation: { rotationHz: 0.3 },
            });
            await i.reply({
              ephemeral: false,
              content: `${client.emoji.tick} 8D Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            });
          }
          if (value === "night_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.13 },
                { band: 1, gain: 0.14 },
                { band: 2, gain: 0.16 },
                { band: 3, gain: 0.12 },
                { band: 4, gain: 0.09 },
                { band: 5, gain: 0 },
                { band: 6, gain: 0 },
                { band: 7, gain: 0.06 },
                { band: 8, gain: 0.11 },
                { band: 9, gain: 0.12 },
                { band: 10, gain: 0.16 },
                { band: 11, gain: 0.17 },
                { band: 12, gain: 0.2 },
                { band: 13, gain: 0.22 },
                { band: 14, gain: 0.22 },
              ],
              timescale: { speed: 1.1, pitch: 1.25, rate: 1.05 },
              tremolo: { depth: 0.3, frequency: 14 },
              volume: 1.1,
            });
            i.reply({
              content: `${client.emoji.tick} NightCore Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            });
          }
          if (value === "pitch_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              timescale: {
                pitch: 1.3,
                speed: 1.0,
                rate: 1.921,
              },
              volume: 1.05,
            });
            i.reply({
              content: `${client.emoji.tick} Pitch Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            });
          }
          if (value === "distort_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.23 },
                { band: 1, gain: 0.23 },
                { band: 2, gain: 0.23 },
                { band: 3, gain: 0.18 },
                { band: 4, gain: 0.13 },
                { band: 5, gain: -0.1 },
                { band: 6, gain: -0.15 },
                { band: 7, gain: -0.16 },
                { band: 8, gain: -0.12 },
                { band: 9, gain: -0.18 },
                { band: 10, gain: -0.22 },
                { band: 11, gain: -0.24 },
                { band: 12, gain: -0.18 },
                { band: 13, gain: -0.16 },
                { band: 14, gain: -0.14 },
              ],
              volume: 1.1,
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Equalizer Mode **ENABLED**`,
            });
          }
          if (value === "eq_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.27 },
                { band: 1, gain: 0.18 },
                { band: 2, gain: 0.07 },
                { band: 3, gain: 0 },
                { band: 4, gain: -0.07 },
                { band: 5, gain: -0.12 },
                { band: 6, gain: -0.14 },
                { band: 7, gain: 0 },
                { band: 8, gain: 0.11 },
                { band: 9, gain: 0.19 },
                { band: 10, gain: 0.16 },
                { band: 11, gain: 0.16 },
                { band: 12, gain: 0.15 },
                { band: 13, gain: 0.18 },
                { band: 14, gain: 0.21 },
              ],
              volume: 1,
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Equalizer Mode **ENABLED**`,
            });
          }
          if (value === "speed_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              timescale: {
                speed: 1.5,
                pitch: 1.15,
                rate: 1.2,
              },
              volume: 1.05,
            });
            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Speed Mode **ENABLED**`,
            });
          }
          if (value === "vapo_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.07 },
                { band: 1, gain: 0.1 },
                { band: 2, gain: 0.13 },
                { band: 3, gain: 0 },
                { band: 4, gain: -0.09 },
                { band: 5, gain: -0.12 },
                { band: 6, gain: -0.15 },
                { band: 7, gain: -0.17 },
                { band: 8, gain: 0 },
                { band: 9, gain: 0.14 },
                { band: 10, gain: 0.16 },
                { band: 11, gain: 0.21 },
                { band: 12, gain: 0.23 },
                { band: 13, gain: 0.18 },
                { band: 14, gain: 0.1 },
              ],
              timescale: { pitch: 0.5, speed: 0.85, rate: 0.9 },
              tremolo: { depth: 0.3, frequency: 14 },
              volume: 1.05,
            });
            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} VaporWave Mode **ENABLED**`,
            });
          }
          if (value === "lofi_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: -0.3 },
                { band: 1, gain: -0.24 },
                { band: 2, gain: -0.12 },
                { band: 3, gain: -0.09 },
                { band: 4, gain: -0.09 },
                { band: 5, gain: 0 },
                { band: 6, gain: 0 },
                { band: 7, gain: 0 },
                { band: 8, gain: 0 },
                { band: 9, gain: 0.11 },
                { band: 10, gain: 0.13 },
                { band: 11, gain: 0.18 },
                { band: 12, gain: 0.24 },
                { band: 13, gain: 0.24 },
                { band: 14, gain: 0.24 },
              ],
              timescale: {
                speed: 0.9,
                pitch: 0.95,
                rate: 0.95,
              },
              tremolo: {
                depth: 0.1,
                frequency: 2.0,
              },
              volume: 0.9,
            });

            i.reply({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Lofi Mode **ENABLED**`,
            });
          }
        }
      }
    });
  },
};
