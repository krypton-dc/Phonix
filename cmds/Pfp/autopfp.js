const AutoPfp = require("@data/pfps");
const autopfpHandler = require("@utils/AutoPfpPoster");

module.exports = {
  name: "autopfp",
  category: "Pfp",
  description: "Automatically post random profile pictures in a channel.",
  usage: "<on|off|interval> [#channel|seconds]",
  userPerms: ["ManageGuild"],
  execute: async (message, args, client) => {
    const guildId = message.guild.id;
    if (!args[0]) {
      const helpEmbed = new client.embed()
        .d(
          "Automatically post random profile pictures at a fixed interval.\n\n" +
            "**Available Actions**"
        )
        .addFields(
          {
            name: "Enable AutoPFP",
            value: "`autopfp on #channel`\nStarts posting profile pictures.",
          },
          {
            name: "Disable AutoPFP",
            value: "`autopfp off`\nStops automatic posting.",
          },
          {
            name: "Change Interval",
            value:
              "`autopfp interval <seconds>`\nMinimum interval is 5 seconds.",
          }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [helpEmbed] });
    }

    const sub = args[0].toLowerCase();

    if (sub === "on") {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply("Please mention a valid channel.");
      }

      await AutoPfp.findOneAndUpdate(
        { guildId },
        { guildId, channelId: channel.id, isEnabled: true },
        { upsert: true }
      );

      autopfpHandler.start(client, guildId);

      return message.channel.send({
        embeds: [
          new client.embed()
            .t("AutoPFP Enabled")
            .d(`AutoPFP is now active.\n\n` + `Posting Channel\n${channel}`)
            .setTimestamp(),
        ],
      });
    }

    if (sub === "off") {
      await AutoPfp.findOneAndUpdate({ guildId }, { isEnabled: false });

      autopfpHandler.stop(guildId);

      return message.channel.send({
        embeds: [
          new client.embed()
            .t("AutoPFP Disabled")
            .d("Automatic profile picture posting has been stopped.")
            .setTimestamp(),
        ],
      });
    }

    if (sub === "interval") {
      const seconds = parseInt(args[1]);
      if (isNaN(seconds) || seconds < 5) {
        return message.reply(
          "Please provide a valid number (minimum 5 seconds)."
        );
      }

      await AutoPfp.findOneAndUpdate({ guildId }, { interval: seconds * 1000 });

      autopfpHandler.stop(guildId);
      autopfpHandler.start(client, guildId);

      return message.channel.send({
        embeds: [
          new client.embed()
            .t("AutoPFP Interval Updated")
            .d(`New Posting Interval\n${seconds} seconds`)
            .setTimestamp(),
        ],
      });
    }
  },
};
