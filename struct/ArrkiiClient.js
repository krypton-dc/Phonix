require("module-alias/register");
const { Client, Collection, MessageFlags } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { AutoPoster } = require("topgg-autoposter");
const mongoose = require("mongoose");

const Box = require("@plugs/Container");
const { cleanTitle } = require("@plugs/Title");
const util = require("@utils/util");
const permissionHandler = require("@events/Client/PremiumChecks");
const loadPlayerManager = require("@loaders/loadPlayerManager");

class ArrkiiClient extends Client {
  constructor() {
    super({
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,
      intents: 53608191,
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      properties: {
        os: "Android",
        browser: "Discord Android",
        device: "Discord Android",
      },
    });

    // Config
    this.config = require("../config.js");
    this.token = this.config.token;
    this.owner = this.config.ownerID;
    this.prefix = this.config.prefix;
    this.color = this.config.embedColor;

    // Links
    this.support = this.config.links.support;
    this.icon = this.config.links.icon;
    this.invite = this.config.links.invite;
    this.web = this.config.links.website;

    // Other config
    this.topgg = this.config.topgg;

    // Core Collections
    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.aliases = new Collection();
    this.cooldowns = new Collection();
    this.spamMap = new Map();

    // Utilities / Helpers
    this.cleanTitle = cleanTitle;
    this.util = new util(this);
    this.logger = require("@plugs/Logger");
    this.tracktime = require("@utils/formatDuration");
    this.button = require("@plugs/Button");
    this.embed = require("@plugs/Embed")(this.color);
    this.emoji = require("@custom/emoji");

    // Init plugs
    require("@plugs/Numformat")(this);
    require("@plugs/Url")(this);

    // Structures
    this.box = () => new Box();

    // Music / Manager
    this.manager = null;
    loadPlayerManager(this);

    // MongoDB & Top.gg
    this._connectMongodb();
    this._initAutoPoster();

    // Premium / Event checks
    permissionHandler(this);

    // Loaders
    [
      "loadAntinukes",
      "loadAutoMods",
      "loadClients",
      "loadCustom",
      "loadNodes",
      "loadTickets",
      "loadPlayers",
      "loadCommands",
    ].forEach((handler) => {
      require(`../loaders/${handler}`)(this);
    });
  }

  async _connectMongodb() {
    mongoose.set("strictQuery", false);

    const dbOptions = {
      autoIndex: false,
      connectTimeoutMS: 1000,
      family: 4,
    };

    try {
      await mongoose.connect(this.config.mongourl, dbOptions);
      this.logger.log("[DB] Database connected", "ready");

      mongoose.connection.on("disconnected", () => {
        this.logger.log("[DB] Mongoose disconnected", "error");
      });
    } catch (err) {
      this.logger.log(`[DB] Mongoose connection error: ${err.stack}`, "error");
    }
  }

      _initAutoPoster() {
    if (!this.topgg) {
      this.logger.log("Top.gg API token is not set.", "error");
      return;
    }

    AutoPoster(this.topgg, this)
      .on("posted", () => {
        this.logger.log("Posted stats to top.gg!", "ready");
      })
      .on("error", (err) => {
        this.logger.log(`Error posting stats to top.gg: ${err}`, "error");
      });
  }
    
  connect() {
    return super.login(this.token);
  }
}

module.exports = ArrkiiClient;
