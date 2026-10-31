const {
  MessageFlags,
  ComponentType,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { transliterate } = require("transliteration");
const axios = require("axios");

module.exports = {
  name: "lyrics",
  category: "Music",
  cooldown: 5,
  description: "Shows lyrics for the current song (supports live sync)",
  player: true,
  args: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  activeSyncSessions: new Map(),

  parseTimestamp(ts) {
    const match = ts.match(/(\d+):(\d{2})\.(\d+)/);
    if (!match) return 0;
    const m = parseInt(match[1]);
    const s = parseInt(match[2]);
    const ms = parseInt(match[3]) / Math.pow(10, match[3].length);
    return m * 60 + s + ms;
  },
    
  isAlreadyLatinScript(text) {
    if (!text) return true;

    const latinChars = text.match(/[a-zA-Z0-9\s\.,!?'"()\-_]/g) || [];
    const totalChars = text.replace(/\s/g, "").length;

    if (totalChars === 0) return true;

    // If 80% or more characters are already Latin script, consider it already transliterated
    const latinRatio = latinChars.length / text.length;
    return latinRatio >= 0.8;
  },

  // Enhanced transliteration function with smart detection
  perfectTransliterate(text) {
    if (!text) return "";

    // If already in Latin script (Hinglish/English), return as is with light cleanup
    if (this.isAlreadyLatinScript(text)) {
      return text
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim(); // Trim leading/trailing whitespace
    }

    let result = transliterate(text, {
      unknown: "",
      separator: " ",
      ignore: ["-", "_", ".", ",", "!", "?", "'", '"', "(", ")"],
    });

    // Clean up the result
    result = result
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Trim leading/trailing whitespace
      .trim()
      // Remove any remaining problematic characters but keep basic punctuation
      .replace(/[^\w\s\-\.,!?'"()]/g, "");

    // If transliteration failed or produced very short result, return original
    if (!result || result.length < Math.min(text.length * 0.3, 2)) {
      return text;
    }

    return result;
  },

  // Enhanced lyrics processing
  processLyricsText(lyrics) {
    if (!lyrics) return "";

    // Split into lines and process each line
    return lyrics
      .split("\n")
      .map((line) => this.perfectTransliterate(line))
      .filter((line) => line.length > 0) // Remove empty lines
      .join("\n");
  },

  async searchLyrics(query) {
    try {
      // Try original query first, then transliterated if needed
      let searchQuery = query;
      if (!this.isAlreadyLatinScript(query)) {
        searchQuery = this.perfectTransliterate(query);
      }

      const res = await axios.get("https://lrclib.net/api/search", {
        params: { q: searchQuery },
        timeout: 5000,
      });
      const data = res.data[0];
      if (!data) return null;

      return {
        title: data.trackName || data.name,
        artist: data.artistName || data.artist,
        lyrics: data.plainLyrics,
        syncedLyrics: data.syncedLyrics,
        hasSync: !!data.syncedLyrics,
      };
    } catch {
      return null;
    }
  },

  splitLyrics(lyrics, maxLen = 900) {
    const lines = lyrics.split("\n");
    const pages = [];
    let chunk = "";
    for (const line of lines) {
      const newChunk = chunk ? `${chunk}\n${line}` : line;
      if (newChunk.length > maxLen && chunk) {
        pages.push(chunk);
        chunk = line;
      } else {
        chunk = newChunk;
      }
    }
    if (chunk) pages.push(chunk);
    return pages;
  },

  async startSync(message, data, player, sent, client) {
    const key = `${message.guild.id}-${message.author.id}`;
    if (this.activeSyncSessions.has(key)) {
      this.activeSyncSessions.get(key).stop();
    }

    const lines = data.syncedLyrics
      .split("\n")
      .map((l) => {
        const match = l.match(/(\d+:\d{2}\.\d+)\s*(.*)/);
        if (!match) return null;
        return {
          time: this.parseTimestamp(match[1]),
          text: this.perfectTransliterate(match[2]),
        };
      })
      .filter(Boolean);

    let idx = 0;
    let active = true;
    const stop = () => (active = false);
    this.activeSyncSessions.set(key, { stop });

    const update = async () => {
      if (!active || !player.playing) {
        this.activeSyncSessions.delete(key);
        return;
      }

      const pos = player.position / 1000;
      while (idx < lines.length && lines[idx].time <= pos) idx++;

      const window = 6;
      const start = Math.max(0, idx - Math.floor(window / 2) - 1);
      const visible = lines.slice(start, start + window);
      const display = visible
        .map((line, i) => {
          const global = start + i;
          return global === idx - 1 || global === idx
            ? `# ${line.text}`
            : line.text;
        })
        .join("\n");

      // Build container
      const box = client.box();
      box.text(`🎵 **${this.perfectTransliterate(data.title)}** ✨`);
      box.text(`🎤 ${this.perfectTransliterate(data.artist)}`);
      box.sep();
      box.text(`${display ? display : "Waiting for lyrics..."}`);
      box.sep();
      box.text(`-# 🎵 Real-time sync • updates every 0.8s`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("sync")
          .setEmoji("✨")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("delete")
          .setEmoji("⏹️")
          .setStyle(ButtonStyle.Danger)
      );

      box.addActionRowComponents(row);

      try {
        await sent.edit({
          components: box.toJSON().components,
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {
        this.activeSyncSessions.delete(key);
        return;
      }

      if (active) setTimeout(update, 800);
    };

    update();
    return { stop };
  },

  async execute(message, args, client) {
    const player = client.manager.players.get(message.guild.id);
    if (!player || !player.playing || !player.queue.current) {
      return message.channel.send({
        components: [
          client
            .box()
            .text("🚫 No Active Playback")
            .sep()
            .text("▶️ Use play to start a song"),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const track = player.queue.current;
    const title = client.cleanTitle(track.title, track.author);
    const query = `${title} ${track.author}`;

    const sent = await message.channel.send({
      components: [
        client
          .box()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("🔄 Fetching Lyrics...")
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`🎵 ${track.title}`)
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const data = await this.searchLyrics(query);
    if (!data || !data.lyrics) {
      return sent.edit({
        components: [
          client
            .box()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent("🔍 Lyrics Not Found")
            )
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `No lyrics for **${track.title}**`
              )
            ),
        ],
      });
    }

    // Process all text through perfect transliteration
    const transliteratedTitle = this.perfectTransliterate(data.title);
    const transliteratedArtist = this.perfectTransliterate(data.artist);
    const transliteratedLyrics = this.processLyricsText(data.lyrics);

    const pages = this.splitLyrics(transliteratedLyrics);
    let page = 0;
    let syncMode = null;
    let syncing = false;

    const render = () => {
      const box = client.box();

      box.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🎵 **${transliteratedTitle}**`)
      );
      box.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🎤 ${transliteratedArtist}`)
      );
      box.addSeparatorComponents(new SeparatorBuilder());
      box.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(pages[page])
      );
      box.addSeparatorComponents(new SeparatorBuilder());
      box.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📖 Page ${page + 1}/${pages.length} ${
            data.hasSync ? "• ✨ Sync Available" : ""
          }`
        )
      );

      // Buttons array
      const buttons = [];

      if (pages.length > 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("<:arrow_red_left:1386986672754921522>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0)
        );
      }

      if (data.hasSync) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId("sync")
            .setEmoji("✨")
            .setStyle(ButtonStyle.Success)
        );
      }

      if (pages.length > 1) {
        buttons.push(
          new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("<:arrow:1386986670129418361>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === pages.length - 1)
        );
      }

      buttons.push(
        new ButtonBuilder()
          .setCustomId("delete")
          .setEmoji("<:discotoolsxyzicon70:1386986831626764359>")
          .setStyle(ButtonStyle.Danger)
      );

      const row = new ActionRowBuilder().addComponents(buttons);
      box.addActionRowComponents(row);

      return box;
    };

    await sent.edit({
      components: render().toJSON().components,
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = sent.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600000,
    });

    collector.on("collect", async (int) => {
      if (int.user.id !== message.author.id) {
        return int.reply({
          content: "🔒 Only you can control these lyrics",
          ephemeral: true,
        });
      }
      await int.deferUpdate();

      if (int.customId === "sync" && data.hasSync) {
        if (syncing) {
          syncMode.stop();
          syncing = false;
          await sent.edit({ components: render().toJSON().components });
        } else {
          syncMode = await this.startSync(message, data, player, sent, client);
          if (syncMode) syncing = true;
        }
      } else if (int.customId === "prev" && page > 0 && !syncing) {
        page--;
        await sent.edit({ components: render().toJSON().components });
      } else if (
        int.customId === "next" &&
        page < pages.length - 1 &&
        !syncing
      ) {
        page++;
        await sent.edit({ components: render().toJSON().components });
      } else if (int.customId === "delete") {
        collector.stop("deleted");
      }
    });

    collector.on("end", async (_, reason) => {
      if (syncMode) syncMode.stop();
      this.activeSyncSessions.delete(
        `${message.guild.id}-${message.author.id}`
      );
      if (reason === "deleted") {
        sent.delete().catch(() => {});
      } else {
        sent
          .edit({
            components: [
              client
                .box()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent("⏰ Session Expired")
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent("Use /lyrics again")
                ),
            ],
          })
          .catch(() => {});
      }
    });
  },
};
