const { EmbedBuilder } = require('discord.js');
const Premium = require('@data/premium');

const boostLimits = {
  day: 1,
  week: 1,
  month: 3,
  year: 5,
  permanent: 5,
};

module.exports = {
  name: 'boost',
  description: 'Boost a server or show boost list.',
  usage: '[list]',
  execute: async (message, args, client) => {
    const userId = message.author.id;
    const premiumData = await Premium.findOne({ userId });
    if (!premiumData) {
      return message.reply('You do not have an active premium to boost servers.');
    }

    if (premiumData.expiresAt && premiumData.expiresAt < new Date()) {
      return message.reply('Your premium has expired, boosting not allowed.');
    }

if (args[0] && args[0].toLowerCase() === 'list') {
  if (!premiumData.boostedServers.length) {
    return message.reply('You have not boosted any servers yet.');
  }

  const guilds = await Promise.all(
    premiumData.boostedServers.map(async (id) => {
      try {
        return await client.guilds.fetch(id);
      } catch {
        return null; // guild not found or bot not in guild
      }
    })
  );

  const validGuilds = guilds.filter((g) => g !== null);

  const expiration = premiumData.expiresAt
    ? `<t:${Math.floor(new Date(premiumData.expiresAt).getTime() / 1000)}:R>`
    : 'Permanent';

  const boostedList = validGuilds
    .map(
      (g, index) =>
        `${index + 1}. **${g.name}** (ID: \`${g.id}\`) - Expires: ${expiration}`
    )
    .join('\n');

  return message.reply({
    embeds: [
      new client.embed()
        .t(`${message.author.username}'s Boosted Servers`)
        .d(boostedList),
    ],
  });
}


    const limit = boostLimits[premiumData.tier] || 0;

    if (premiumData.boostsUsed >= limit) {
      return message.reply(
        `You reached your boost limit of ${limit} for your premium tier **${premiumData.tier}**.`
      );
    }

    const serverId = message.guildId;
    if (!serverId) {
      return message.reply('This command can only be used in a server.');
    }

    if (premiumData.boostedServers.includes(serverId)) {
      return message.reply('You have already boosted this server.');
    }

    await Premium.updateOne(
      { userId },
      { $inc: { boostsUsed: 1 }, $push: { boostedServers: serverId } }
    );

    const boostsLeft = limit - (premiumData.boostsUsed + 1);

    return message.reply({
      embeds: [
        new client.embed()
          .t('Boost Applied')
          .d(
            `You have successfully boosted server \`${serverId}\`.\n` +
            `Boosts used: ${premiumData.boostsUsed + 1}/${limit}\n` +
            `Boosts left: ${boostsLeft}`
          ),
      ],
    });
  },
};
