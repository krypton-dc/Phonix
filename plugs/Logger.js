const moment = require("moment-timezone");
const { WebhookClient, EmbedBuilder, Colors } = require("discord.js");
const figlet = require("figlet");
const Table = require("cli-table3");
const config = require("../config");

class Logger {
  static webhookClient = null;
  static webhookTypes = ["error"];
  static baseColors = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
  ];

  static setupWebhook() {
    this.webhookClient = new WebhookClient({ url: config.Webhooks.error });
  }

  static getColorCode(color) {
    const codes = {
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
      reset: "\x1b[0m",
    };
    return codes[color] || codes.reset;
  }

  static getRandomColor() {
    // Return a random color string from baseColors
    const idx = Math.floor(Math.random() * this.baseColors.length);
    return this.baseColors[idx];
  }

  static log(content, type = "log") {
    if (!this.webhookClient) this.setupWebhook();

    const time = moment().tz("Asia/Kolkata").format("hh:mm:ss A");

    const types = {
      log: { tag: "log", color: "white" },
      warn: { tag: "warn", color: "yellow" },
      error: { tag: "error", color: "red" },
      debug: { tag: "debug", color: "magenta" },
      cmd: { tag: "cmd", color: "blue" },
      event: { tag: "event", color: "cyan" },
      ready: { tag: "ready", color: "green" },
    };

    const logType = types[type] || types.log;

    // Use random color instead of fixed color for console output
    const randomColor = this.getRandomColor();

    const clr = this.getColorCode(randomColor);
    const gray = this.getColorCode("gray");
    const white = this.getColorCode("white");
    const reset = this.getColorCode("reset");

    const tag = logType.tag.padEnd(6);
    const timeStr = time.padEnd(11);

    // Format: tag  @ time :: message with random color
    console.log(
      `${clr}${tag}${reset} ${gray}@${reset} ${gray}${timeStr}${reset} ${white}::${reset} ${clr}${content}${reset}`
    );

    this.sendToWebhook(content, type, time);
  }

  static startup(botName, prefix, lang, version, nodeVer, storage) {
    console.clear();

    // ASCII banner
    console.log(
      this.getColorCode("blue") +
        figlet.textSync(botName, { font: "Standard" }) +
        this.getColorCode("reset")
    );

    // Info table
    const table = new Table({
      colWidths: [20, 25],
    });
    table.push(
      ["Prefixes", prefix],
      ["Language", lang],
      ["Phonix Version", version],
      ["Node.js Version", nodeVer],
      ["Storage Type", storage]
    );
    console.log(table.toString());
  }

  static async sendToWebhook(content, type, time) {
    if (!this.webhookClient || !this.webhookTypes.includes(type)) return;

    const embed = new EmbedBuilder()
      .setColor(type === "error" ? Colors.Red : Colors.Blue)
      .setTitle(`Logger - ${type}`)
      .setDescription(content)
      .setTimestamp(new Date())
      .setFooter({ text: `Time: ${time} (Asia/Kolkata)` });

    try {
      await this.webhookClient.send({ embeds: [embed] });
    } catch (err) {
      console.error("error  @ webhook     :: failed to send log");
    }
  }

  static setWebhookTypes(types = ["error"]) {
    this.webhookTypes = types;
  }
}

module.exports = Logger;
