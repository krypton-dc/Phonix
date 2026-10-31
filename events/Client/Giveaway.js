const Giveaway = require("@data/giveaway");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "clientReady",
  async run(client) {
    setInterval(async () => {
      const giveaways = await Giveaway.find({ ended: false });
      if (giveaways.length === 0) return;

      for (const giveaway of giveaways) {
        if (Date.now() < giveaway.endAt.getTime()) continue;
        giveaway.ended = true;
        await giveaway.save();

        const guild = client.guilds.cache.get(giveaway.guildId);
        if (!guild) continue;
        const channel = guild.channels.cache.get(giveaway.channelId);
        if (!channel) continue;

        try {
          const message = await channel.messages.fetch(giveaway.messageId);
          const reaction = message.reactions.cache.get("1429515347748196532")
          if (!reaction) {
            console.error(
              `Could not find reaction for giveaway #${giveaway.messageId}. It might have been removed.`
            );
            continue;
          }
          const users = (await reaction.users.fetch()).filter((u) => !u.bot);
          let validEntries = Array.from(users.values());
          if (giveaway.requiredRole) {
            const role = guild.roles.cache.get(giveaway.requiredRole);
            if (role) {
              const members = await guild.members.fetch({
                user: validEntries.map((u) => u.id),
              });
              validEntries = validEntries.filter((user) =>
                members.get(user.id)?.roles.cache.has(role.id)
              );
            }
          }
          if (validEntries.length === 0) {
            const noWinnerEmbed = new EmbedBuilder()
              .setColor("#F04747")
              .setTitle(giveaway.prize)
              .setDescription(
                "This giveaway has ended.\n\nSadly, there were no valid entries."
              )
              .setTimestamp()
              .setFooter({ text: "Giveaway Ended" });

            await message.edit({
              content: "**GIVEAWAY ENDED**",
              embeds: [noWinnerEmbed],
            });
          } else {
            const winners = [];
            const shuffled = validEntries.sort(() => 0.5 - Math.random());
            for (
              let i = 0;
              i < giveaway.winnerCount && i < shuffled.length;
              i++
            ) {
              winners.push(shuffled[i]);
            }

            const winnerString = winners.map((w) => w.toString()).join(", ");

            const winnerEmbed = new client.embed()
              .t(giveaway.prize)
              .d(
                `> Hoster: <@${giveaway.hostedBy}>\n> Winners: ${winnerString}`
              );

            await message.edit({
              embeds: [winnerEmbed],
            });

            await channel.send({
              content: `- Congratulations ${winnerString}! You won the **${giveaway.prize} by <@${giveaway.hostedBy}>**`,
            });
          }
        } catch (err) {
          client.logger.log(err, 'error');
        }
      }
    }, 15000);
  },
};
