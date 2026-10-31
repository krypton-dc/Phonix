const { MessageFlags } = require("discord.js");
const db247 = require("@data/247");
const AntiBadwords = require("@data/antibadword");
const Antilink = require("@data/antilink");
const Antispam = require("@data/antispam");
const Antinuke = require("@data/antinuke");
const Autorole = require("@data/autorole");
const Vcrole = require("@data/voicerole");

function createConfigContainer(
  prefix,
  is247,
  antibadwords,
  antilink,
  antispam,
  antinuke,
  autorole,
  vcrole,
  autoplay,
  client,
  message
) {
  const x = client
    .box()
    .text(
      `# **Server Configuration**\n-# Status of all configured features for this server.`
    )
    .sep()
    .text(`> **Server Prefix:** \`${prefix}\``)
    .sep();

  const status247 = is247 ? client.emoji.tick : client.emoji.cross;
  const statusAntilink = antilink ? client.emoji.tick : client.emoji.cross;
  const statusAntispam = antispam ? client.emoji.tick : client.emoji.cross;
  const statusAntinuke = antinuke ? client.emoji.tick : client.emoji.cross;
  const statusAutorole = autorole ? client.emoji.tick : client.emoji.cross;
  const statusVcrole = vcrole ? client.emoji.tick : client.emoji.cross;
  const statusAp = autoplay ? client.emoji.tick : client.emoji.cross;
  const abw = antibadwords ? client.emoji.tick : client.emoji.cross;

  x.text(`**Automod Features**`);
  x.text(
    `> **Antibad-Word:** ${abw}\n> **Anti-Link:** ${statusAntilink}\n> **Anti-Spam:** ${statusAntispam}\n> **Anti-Nuke:** ${statusAntinuke}`
  );
  x.sep();
  x.text(`**Role Features**`);
  x.text(`> **Auto-Role:** ${statusAutorole}\n> **Vc-Role:** ${statusVcrole}`);
  x.sep();
  const player = client.manager.players.get(message.guild.id);
  const isPlayerActive = !!player;
  x.text(`**Music Player Status**`);
  x.text(
    `> **Player Active:** ${
      isPlayerActive ? client.emoji.tick : client.emoji.cross
    }\n> **24/7 Mode:** ${status247}\n> **Auto-Play:** ${statusAp}`
  );

  if (isPlayerActive) {
    x.text(
      `> **Text-Channel:** <#${player.textId}>\n> **Voice-Channel:** <#${player.voiceId}>`
    );
  }

  return [x];
}

module.exports = {
  name: "config",
  category: "Config",
  description: "View the server's current configuration for all features.",
  userPerms: ["ManageGuild"],
  botPerms: ["SendMessages"],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    try {
      const player = client.getP(message.guildId);
      const is247 = await db247.findOne({ Guild: message.guild.id });
const antibadwordsDoc = await AntiBadwords.findOne({ guildId: message.guild.id });
const antibadwords = antibadwordsDoc?.enabled ?? false;
const antilinkDoc = await Antilink.findOne({ guildId: message.guild.id });
const antilink = antilinkDoc?.isEnabled ?? false;
const antispamDoc = await Antispam.findOne({ guildId: message.guild.id });
const antispam = antispamDoc?.isEnabled ?? false;
const antinukeDoc = await Antinuke.findOne({ guildId: message.guild.id });
const antinuke = antinukeDoc?.isEnabled ?? false;
const autoroleDoc = await Autorole.findOne({ guildId: message.guild.id });
const autorole =
  !!autoroleDoc &&
  (
    (Array.isArray(autoroleDoc.humanRoles) && autoroleDoc.humanRoles.length > 0) ||
    (Array.isArray(autoroleDoc.botRoles) && autoroleDoc.botRoles.length > 0)
  );

// VC Role
const vcroleDoc = await Vcrole.findOne({ guildId: message.guild.id });
const vcrole =
  !!vcroleDoc &&
  (vcroleDoc.humanRole !== null || vcroleDoc.botRole !== null);

const autoplay = player?.data?.get("autoplay") || false;

      const components = createConfigContainer(
  prefix,
  !!is247,
  antibadwords,
  antilink,
  antispam,
  antinuke,
  autorole,
  vcrole,
  autoplay,
  client,
  message
);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: components,
      });
    } catch (error) {
      client.logger.log(error, "log");
      await message.reply({
        content: "There was an error fetching the server configuration.",
        ephemeral: true,
      });
    }
  },
};
