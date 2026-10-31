const AutoPfp = require("@data/pfps");
const { EmbedBuilder } = require("discord.js");

const intervals = new Map();

module.exports = {
  start: async (client, guildId) => {
    const data = await AutoPfp.findOne({ guildId, isEnabled: true });
    if (!data) return;

    if (intervals.has(guildId)) clearInterval(intervals.get(guildId));

    const loop = setInterval(async () => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        const chan = guild.channels.cache.get(data.channelId);
        if (!chan) return;

        await guild.members.fetch().catch(() => {});
        const members = guild.members.cache.filter((m) => !m.user.bot);
        if (!members.size) return;

        const randomMember = members.random();
        const avatar = randomMember.user.displayAvatarURL({
          dynamic: true,
          size: 1024,
        });

        const embed = new EmbedBuilder()
          .setAuthor({
            name: "📸 AutoPFP",
            iconURL: client.user.displayAvatarURL(),
          })
          .setImage(avatar)
          .setFooter({
            text: `Phonix AutoPFP`,
            iconURL: randomMember.user.displayAvatarURL(),
          })
          .setTimestamp();

        chan.send({ embeds: [embed] });
      } catch (err) {
        console.error("AutoPFP loop error:", err);
      }
    }, data.interval || 10000);

    intervals.set(guildId, loop);
  },

  stop: async (guildId) => {
    if (intervals.has(guildId)) {
      clearInterval(intervals.get(guildId));
      intervals.delete(guildId);
    }
  },

  restartAll: async (client) => {
    const allEnabled = await AutoPfp.find({ isEnabled: true });
    for (const g of allEnabled) {
      module.exports.start(client, g.guildId);
    }
  },

  setIntervalTime: async (guildId, ms) => {
    const data = await AutoPfp.findOne({ guildId });
    if (data) {
      data.interval = ms;
      await data.save();
      module.exports.stop(guildId);
      // You can optionally restart loop immediately after changing interval
    }
  },
};
