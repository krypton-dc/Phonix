const ms = require("ms");
const { EmbedBuilder } = require("discord.js");
const Giveaway = require("@data/giveaway");

module.exports = {
  name: "gstart",
  category: "Giveaway",
  args: true,
  description: "Starts a new giveaway in the server.",
  usage: "<time> <winners> [requiredRole] <prize>",
  userPerms: ["ManageGuild"],
  botPerms: ["SendMessages", "EmbedLinks", "AddReactions", "ManageMessages"],
  execute: async (message, args, client) => {
    try {
      // --- Parsing Arguments ---
      const giveawayDuration = args[0];
      const giveawayWinners = parseInt(args[1], 10);
      let requiredRole = null;
      let prize;

      const potentialRoleArg = args[2];
      const roleIdMatch = potentialRoleArg.match(/^<@&(\d+)>$/);
      const role = roleIdMatch
        ? message.guild.roles.cache.get(roleIdMatch[1])
        : message.guild.roles.cache.get(potentialRoleArg);

      if (role) {
        requiredRole = role;
        prize = args.slice(3).join(" ");
      } else {
        prize = args.slice(2).join(" ");
      }

      const durationMs = ms(giveawayDuration);

      // --- Input Validation ---
      if (isNaN(durationMs) || durationMs < 60000) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#F04747")
              .setDescription(
                "Invalid duration. Please use a valid time format (e.g., `1h`, `1d`). Minimum duration is 1 minute."
              ),
          ],
        });
      }

      if (isNaN(giveawayWinners) || giveawayWinners < 1) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#F04747")
              .setDescription(
                "Invalid winner count. The number of winners must be at least 1."
              ),
          ],
        });
      }

      if (!prize) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#F04747")
              .setDescription("You must specify a prize for the giveaway!"),
          ],
        });
      }

      // --- Giveaway Start ---
      const endAt = new Date(Date.now() + durationMs);

      const giveawayEmbed = new client.embed()
        .t(prize)
        .d(
          `Hosted by: ${
            message.author
          }\nWinners: ${giveawayWinners}\nEnds: <t:${Math.floor(
            endAt.getTime() / 1000
          )}:R>\n> React with ${client.emoji.giveaway} to enter!`
        );

      if (requiredRole) {
        giveawayEmbed.addFields({
          name: "Requirement",
          value: `Must have the ${requiredRole} role.`,
          inline: false,
        });
      }

      const msg = await message.channel.send({
        embeds: [giveawayEmbed],
      });
      await msg.react(client.emoji.giveaway);

      // --- Database Integration ---
      await new Giveaway({
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: msg.id,
        prize,
        winnerCount: giveawayWinners,
        startAt: new Date(),
        endAt,
        hostedBy: message.author.id,
        requiredRole: requiredRole ? requiredRole.id : null,
        ended: false,
        entries: [],
      }).save();

      // --- Cleanup and Confirmation ---
      await message.delete().catch(() => {});
    } catch (error) {
      console.error("Error starting giveaway:", error);
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#F04747")
            .setDescription(
              "An unexpected error occurred. Please check my permissions and try again."
            ),
        ],
      });
    }
  },
};
