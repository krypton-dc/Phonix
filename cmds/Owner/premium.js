const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const Premium = require('@data/premium');

module.exports = {
  name: 'premium',
  aliases: ['prm'],
  category: 'Owner',
  description: 'Manage Premium status for users.',
  args: true,
  usage: '<user>',
  execute: async (message, args, client) => {
    const user = await (async () => {
      if (message.mentions.users.first()) return message.mentions.users.first();
      if (args[0]) {
        try {
          return await client.users.fetch(args[0]);
        } catch {
          return client.users.cache.find(
            (u) => u.username.toLowerCase() === args[0].toLowerCase()
          ) || null;
        }
      }
      return null;
    })();

    if (!user)
      return message.reply(
        'Please mention a user or provide a valid user ID or username.'
      );

    const premiumData = await Premium.findOne({ userId: user.id });
    const timeLeft = premiumData?.expiresAt
      ? `<t:${Math.floor(new Date(premiumData.expiresAt).getTime() / 1000)}:R>`
      : premiumData
      ? 'Permanent'
      : 'No Premium assigned';

    const userEmbed = new EmbedBuilder()
      .setTitle(`${user.username}'s Premium Management`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor('#FFD700')
      .addFields({ name: 'Current Status', value: timeLeft });

    const currencyOptions = [
      { label: 'INR', description: 'Price in INR', value: 'INR' },
      { label: 'Dollar', description: 'Price in Dollar', value: 'Dollar' },
    ];

    const tierOptions = [
      { label: 'Day', value: 'day' },
      { label: 'Week', value: 'week' },
      { label: 'Month', value: 'month' },
      { label: 'Year', value: 'year' },
      { label: 'Permanent', value: 'permanent' },
    ];

    const currencyRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('currency_select')
        .setPlaceholder('Select Price Currency')
        .addOptions(currencyOptions)
    );

    const msg = await message.channel.send({
      embeds: [userEmbed],
      components: [currencyRow],
    });

    let selectedCurrency = null;

    const collector = msg.createMessageComponentCollector({
      time: 60000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'You cannot use this select.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === 'currency_select') {
        selectedCurrency = interaction.values[0];

        const tierRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('tier_select')
            .setPlaceholder('Select Premium Tier Duration')
            .addOptions(tierOptions)
        );

        await interaction.update({
          content: 'Now select the premium tier duration:',
          components: [tierRow],
          embeds: [userEmbed],
        });
      } else if (interaction.customId === 'tier_select') {
        if (!selectedCurrency)
          return interaction.reply({
            content: 'Please select currency first.',
            flags: MessageFlags.Ephemeral,
          });

        const selectedTier = interaction.values[0];

        const expiresAt =
          selectedTier === 'permanent'
            ? null
            : new Date(
                Date.now() +
                  {
                    day: 86400000,
                    week: 604800000,
                    month: 2592000000,
                    year: 31536000000,
                  }[selectedTier]
              );

        // Reset boostsUsed on new premium assignment
        await Premium.updateOne(
          { userId: user.id },
          {
            userId: user.id,
            premium: true,
            priceCurrency: selectedCurrency,
            tier: selectedTier,
            expiresAt,
            boostsUsed: 0,
          },
          { upsert: true }
        );

        await interaction.update({
          content: '',
          embeds: [
            new EmbedBuilder().setDescription(
              ` Assigned **${selectedCurrency} - ${selectedTier.toUpperCase()}** Premium to ${user}. Boosts reset to 0.`
            ),
          ],
          components: [],
        });

        collector.stop();
      }
    });

    collector.on('end', () => msg.edit({ components: [] }));
  },
};
