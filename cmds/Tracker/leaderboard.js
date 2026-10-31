const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  ComponentType
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const UserStats = require('@data/UserStats');

module.exports = {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'rankings'],
    category: "Tracker",
    description: 'Display server leaderboard using image',
    cooldown: 10,
    execute: async (message, args, client) => {
               const m = await message.channel.send({
  embeds: [new client.embed().d(`> ${client.emoji.loading} Loading Server Info Please Wait`)]
});
    const canvas = await generateLeaderboard(message.guild, 'messages', message.author.id);
    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
      name: 'message-leaderboard.png'
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('leaderboard_select')
      .setPlaceholder('Switch Leaderboard Type')
      .addOptions([
        {
          label: 'Message Leaderboard',
          description: 'Top message senders',
          value: 'messages'
        },
        {
          label: 'Voice Leaderboard',
          description: 'Top voice users',
          value: 'voice'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const reply = await m.edit({
       embeds: [],
      files: [attachment],
      components: [row]
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000
    });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'This leaderboard is not for you!',
          ephemeral: true
        });
      }

      await interaction.deferUpdate();
      const type = interaction.values[0];
      const newCanvas = await generateLeaderboard(message.guild, type, message.author.id);
      const newAttachment = new AttachmentBuilder(newCanvas.toBuffer('image/png'), {
        name: `${type}-leaderboard.png`
      });

      await reply.edit({
        files: [newAttachment],
        components: [row]
      });
    });

    collector.on('end', () => {
      row.components[0].setDisabled(true);
      reply.edit({ components: [row] }).catch(() => {});
    });
  }
};

async function generateLeaderboard(guild, type, userId) {
  const canvas = createCanvas(1600, 1000);
  const ctx = canvas.getContext('2d');
  const isMessage = type === 'messages';
  const primaryColor = '#00D9FF';
  const secondaryColor = '#0099FF';
  const accentColor = '#00F0FF';

  drawDarkBackground(ctx, 1600, 1000, primaryColor, secondaryColor);

  const sortField = isMessage ? 'totalMessages' : 'totalVoiceTime';
  const topUsers = await UserStats.find({ guildId: guild.id })
    .sort({ [sortField]: -1 })
    .limit(10);

  const userStats = await UserStats.findOne({ userId, guildId: guild.id });
  const userRank = await UserStats.find({ guildId: guild.id }).sort({ [sortField]: -1 });
  const userPosition = userRank.findIndex(u => u.userId === userId) + 1;

  const totalMessages = await UserStats.aggregate([
    { $match: { guildId: guild.id } },
    { $group: { _id: null, total: { $sum: '$totalMessages' } } }
  ]);

  const totalVoice = await UserStats.aggregate([
    { $match: { guildId: guild.id } },
    { $group: { _id: null, total: { $sum: '$totalVoiceTime' } } }
  ]);

  const activeMembers = await UserStats.countDocuments({ guildId: guild.id });

  await drawServerInfo(ctx, guild, 30, 25, 360, 145, primaryColor, secondaryColor);
  await drawMainHeader(ctx, 420, 25, 680, 145, primaryColor, secondaryColor, accentColor, isMessage, totalMessages[0]?.total || 0, totalVoice[0]?.total || 0, activeMembers, guild);
  await drawKeyStats(ctx, guild, userId, userStats, userPosition, 1130, 25, 440, 945, primaryColor, secondaryColor, accentColor, isMessage);
  await drawLeaderboardPanel(ctx, guild, topUsers, 30, 195, 1070, 725, primaryColor, secondaryColor, accentColor, isMessage);
  drawFooter(ctx, 30, 935, 1070, primaryColor, accentColor);

  return canvas;
}

function drawDarkBackground(ctx, width, height, primaryColor, secondaryColor) {
  const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, 1000);
  bgGradient.addColorStop(0, '#0D1117');
  bgGradient.addColorStop(0.5, '#0A0E14');
  bgGradient.addColorStop(1, '#000000');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2 + 0.5;
    const brightness = Math.random();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

async function drawServerInfo(ctx, guild, x, y, width, height, primaryColor, secondaryColor) {
  drawGlowingCard(ctx, x, y, width, height, 15, primaryColor);

  try {
    const guildIcon = await loadImage(guild.iconURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
    ctx.save();
    ctx.shadowColor = primaryColor + 'AA';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(x + 60, y + 73, 40, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(guildIcon, x + 20, y + 33, 80, 80);
    ctx.restore();

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x + 60, y + 73, 43, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } catch (e) {}

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Server', x + 120, y + 50);

  const guildName = guild.name.length > 20 ? guild.name.substring(0, 20) + '...' : guild.name;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(guildName, x + 120, y + 75);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '12px Arial';
  ctx.fillText(`Creation ${new Date(guild.createdTimestamp).toLocaleDateString()}`, x + 120, y + 95);
}

async function drawMainHeader(ctx, x, y, width, height, primaryColor, secondaryColor, accentColor, isMessage, totalMsgs, totalVoice, activeMembers, guild) {
  drawGlowingCard(ctx, x, y, width, height, 15, primaryColor);

  const titleGrad = ctx.createLinearGradient(x + 30, y + 50, x + 500, y + 50);
  titleGrad.addColorStop(0, primaryColor);
  titleGrad.addColorStop(0.5, accentColor);
  titleGrad.addColorStop(1, secondaryColor);
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 40px Arial';
  ctx.fillText(isMessage ? 'MESSAGE LEADERBOARD' : 'VOICE LEADERBOARD', x + 30, y + 55);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 14px Arial';
  ctx.fillText('TOP 10 MOST ACTIVE USERS', x + 30, y + 78);

  const statY = y + 105;
  if (isMessage) {
    drawStatBadge(ctx, x + 30, statY, totalMsgs.toLocaleString(), 'Total Messages', primaryColor);
    drawStatBadge(ctx, x + 240, statY, activeMembers.toString(), 'Active Members', secondaryColor);
    drawStatBadge(ctx, x + 450, statY, guild.channels.cache.size.toString(), 'Total Channels', accentColor);
  } else {
    drawStatBadge(ctx, x + 30, statY, `${(totalVoice / 3600000).toFixed(1)}h`, 'Total Voice Time', primaryColor);
    drawStatBadge(ctx, x + 240, statY, activeMembers.toString(), 'Active Members', secondaryColor);
    drawStatBadge(ctx, x + 450, statY, guild.channels.cache.size.toString(), 'Total Channels', accentColor);
  }
}

function drawStatBadge(ctx, x, y, value, label, color) {
  ctx.fillStyle = color + '30';
  ctx.beginPath();
  ctx.roundRect(x, y, 180, 28, 10);
  ctx.fill();

  ctx.strokeStyle = color + '80';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, 180, 28, 10);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 15, y + 14, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = 'bold 14px Arial';
  ctx.fillText(value, x + 28, y + 18);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '11px Arial';
  ctx.fillText(label, x + 28 + ctx.measureText(value).width + 8, y + 18);
}

async function drawKeyStats(ctx, guild, userId, userStats, userPosition, x, y, width, height, primaryColor, secondaryColor, accentColor, isMessage) {
  drawGlowingCard(ctx, x, y, width, height, 15, primaryColor);

  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 24px Arial';
  ctx.fillText('Key Stats', x + 30, y + 45);

  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) {
    try {
      const userAvatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.save();
      ctx.shadowColor = primaryColor + 'BB';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(x + width / 2, y + 130, 55, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(userAvatar, x + width / 2 - 55, y + 75, 110, 110);
      ctx.restore();

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(x + width / 2, y + 130, 59, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } catch (e) {}
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  const displayName = member ? (member.user.username.length > 14 ? member.user.username.substring(0, 14) + '...' : member.user.username) : 'Unknown';
  ctx.fillText(displayName, x + width / 2, y + 210);

  ctx.fillStyle = primaryColor + '50';
  ctx.beginPath();
  ctx.roundRect(x + width / 2 - 60, y + 230, 120, 38, 12);
  ctx.fill();

  ctx.strokeStyle = primaryColor + 'AA';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + width / 2 - 60, y + 230, 120, 38, 12);
  ctx.stroke();

  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 17px Arial';
  ctx.fillText(`RANK #${userPosition}`, x + width / 2, y + 254);
  ctx.textAlign = 'left';

  let statsY = y + 295;
  if (userStats) {
    drawUserActivitySection(ctx, x + 30, statsY, width - 60, userStats, primaryColor, secondaryColor, accentColor);
    statsY += 220;

    drawActivityChartsSection(ctx, x + 30, statsY, width - 60, 380, userStats, isMessage, primaryColor, secondaryColor, accentColor);
  }
}

function drawUserActivitySection(ctx, x, y, width, userStats, primaryColor, secondaryColor, accentColor) {
  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 18px Arial';
  ctx.fillText('User Activity', x, y);

  drawAnimatedStatCard(ctx, x, y + 30, width, 70, 'Total Messages Sent', userStats.totalMessages.toLocaleString(), userStats.totalMessages, 10000, primaryColor, secondaryColor, accentColor);
  
  drawAnimatedStatCard(ctx, x, y + 115, width, 70, 'Total Voice Time', `${(userStats.totalVoiceTime / 3600000).toFixed(1)}h`, userStats.totalVoiceTime / 3600000, 100, secondaryColor, accentColor, primaryColor);
}
function drawAnimatedStatCard(ctx, x, y, width, height, label, value, currentValue, maxValue, color1, color2, color3) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;

  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  bgGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
  bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  borderGrad.addColorStop(0, color1 + '70');
  borderGrad.addColorStop(0.5, color2 + '50');
  borderGrad.addColorStop(1, color3 + '70');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 11);
  ctx.stroke();

  const accentGrad = ctx.createLinearGradient(x, y, x, y + height);
  accentGrad.addColorStop(0, color1);
  accentGrad.addColorStop(1, color2);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(x, y + 12, 4, height - 24);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(label, x + 20, y + 28);

  const valueGrad = ctx.createLinearGradient(x + 20, y + 50, x + 200, y + 50);
  valueGrad.addColorStop(0, color1);
  valueGrad.addColorStop(1, color2);
  ctx.fillStyle = valueGrad;
  ctx.font = 'bold 24px Arial';
  ctx.fillText(value, x + 20, y + 52);


  
}


function drawActivityChartsSection(ctx, x, y, width, height, userStats, isMessage, primaryColor, secondaryColor, accentColor) {
  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Activity Charts', x, y);

  const chartY = y + 30;
  const chartHeight = height - 30;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;

  const bgGrad = ctx.createLinearGradient(x, chartY, x, chartY + chartHeight);
  bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
  bgGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, chartY, width, chartHeight, 12);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(x, chartY, x + width, chartY + chartHeight);
  borderGrad.addColorStop(0, primaryColor + '70');
  borderGrad.addColorStop(0.5, accentColor + '50');
  borderGrad.addColorStop(1, secondaryColor + '70');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, chartY, width, chartHeight, 12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 2, chartY + 2, width - 4, chartHeight - 4, 11);
  ctx.stroke();

  drawAdvancedActivityChart(ctx, x + 25, chartY + 25, width - 50, chartHeight - 70, userStats, isMessage, primaryColor, secondaryColor, accentColor);
}

function drawAdvancedActivityChart(ctx, x, y, width, height, userStats, isMessage, primaryColor, secondaryColor, accentColor) {
  if (!userStats || !userStats.dailyActivity) return;

  const filledData = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    date.setHours(0, 0, 0, 0);
    const found = userStats.dailyActivity.find(d => {
      const dDate = new Date(d.date);
      return dDate.toDateString() === date.toDateString();
    });
    filledData.push(found || { date, messages: 0, voiceTime: 0 });
  }

  const messageValues = filledData.map(d => d.messages || 0);
  const voiceValues = filledData.map(d => (d.voiceTime / 3600000) || 0);
  const maxMessages = Math.max(...messageValues, 1);
  const maxVoice = Math.max(...voiceValues, 1);

  const padding = 0;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / messageValues.length) - 8;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  for (let i = 0; i <= 5; i++) {
    const yPos = y + padding + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x + padding, yPos);
    ctx.lineTo(x + width - padding, yPos);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < messageValues.length; i++) {
    const xPos = x + padding + (i * (chartWidth / messageValues.length)) + barWidth / 2 + 4;
    ctx.beginPath();
    ctx.moveTo(xPos, y + padding);
    ctx.lineTo(xPos, y + height - padding);
    ctx.stroke();
  }

  messageValues.forEach((val, i) => {
    const barHeight = (val / maxMessages) * chartHeight;
    const barX = x + padding + (i * (chartWidth / messageValues.length)) + 4;
    const barY = y + padding + chartHeight - barHeight;

    if (val > 0) {
      ctx.save();
      ctx.shadowColor = primaryColor + 'AA';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 5;

      const barGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      barGradient.addColorStop(0, primaryColor + 'FF');
      barGradient.addColorStop(0.4, accentColor + 'EE');
      barGradient.addColorStop(1, primaryColor + 'AA');
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth / 2 - 2, barHeight, [5, 5, 0, 0]);
      ctx.fill();
      ctx.restore();

      const highlightGradient = ctx.createLinearGradient(barX, barY, barX + barWidth / 4, barY);
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fillRect(barX, barY, barWidth / 5, barHeight);

      ctx.strokeStyle = primaryColor + 'EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth / 2 - 2, barHeight, [5, 5, 0, 0]);
      ctx.stroke();
    }
  });

  voiceValues.forEach((val, i) => {
    const barHeight = (val / maxVoice) * chartHeight;
    const barX = x + padding + (i * (chartWidth / voiceValues.length)) + 4 + barWidth / 2;
    const barY = y + padding + chartHeight - barHeight;

    if (val > 0) {
      ctx.save();
      ctx.shadowColor = secondaryColor + 'AA';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 5;

      const barGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
      barGradient.addColorStop(0, secondaryColor + 'FF');
      barGradient.addColorStop(0.4, '#5599FF' + 'EE');
      barGradient.addColorStop(1, secondaryColor + 'AA');
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth / 2 - 2, barHeight, [5, 5, 0, 0]);
      ctx.fill();
      ctx.restore();

      const highlightGradient = ctx.createLinearGradient(barX, barY, barX + barWidth / 4, barY);
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fillRect(barX, barY, barWidth / 5, barHeight);

      ctx.strokeStyle = secondaryColor + 'EE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth / 2 - 2, barHeight, [5, 5, 0, 0]);
      ctx.stroke();
    }
  });

  const legendY = y + height + 20;
  
  ctx.save();
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(x + 20, legendY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#E0E0E0';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('Messages', x + 35, legendY + 5);

  ctx.save();
  ctx.shadowColor = secondaryColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.arc(x + 135, legendY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#E0E0E0';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('Voice', x + 150, legendY + 5);

  if (maxMessages > 0 || maxVoice > 0) {
    const peakGrad = ctx.createLinearGradient(x + width - 100, legendY, x + width, legendY);
    peakGrad.addColorStop(0, primaryColor);
    peakGrad.addColorStop(1, secondaryColor);
    ctx.fillStyle = peakGrad;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Peak: ${Math.round(maxMessages)}msg / ${maxVoice.toFixed(1)}h`, x + width, legendY + 5);
    ctx.textAlign = 'left';
  }
}

async function drawLeaderboardPanel(ctx, guild, topUsers, x, y, width, height, primaryColor, secondaryColor, accentColor, isMessage) {
  drawGlowingCard(ctx, x, y, width, height, 15, primaryColor);

  const titleGrad = ctx.createLinearGradient(x + 40, y + 50, x + 500, y + 50);
  titleGrad.addColorStop(0, primaryColor);
  titleGrad.addColorStop(0.5, accentColor);
  titleGrad.addColorStop(1, secondaryColor);
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 32px Arial';
  ctx.fillText(isMessage ? 'TOP MESSAGE SENDERS' : 'TOP VOICE USERS', x + 40, y + 55);

  ctx.save();
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 15;
  const accentLineGrad = ctx.createLinearGradient(x + 40, y + 68, x + 280, y + 68);
  accentLineGrad.addColorStop(0, primaryColor);
  accentLineGrad.addColorStop(0.5, accentColor);
  accentLineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = accentLineGrad;
  ctx.fillRect(x + 40, y + 68, 240, 4);
  ctx.restore();

  for (let i = 0; i < topUsers.length && i < 10; i++) {
    await drawUserRow(ctx, guild, topUsers[i], x + 40, y + 105 + i * 60, width - 80, 50, i + 1, isMessage, primaryColor, secondaryColor, accentColor);
  }
}

async function drawUserRow(ctx, guild, userData, x, y, width, height, rank, isMessage, primaryColor, secondaryColor, accentColor) {
  const member = await guild.members.fetch(userData.userId).catch(() => null);
  if (!member) return;

  const rankColors = {
    1: { bg: 'rgba(0, 217, 255, 0.18)', text: '#00F0FF', border: '#00D9FF', glow: '#00F0FF' },
    2: { bg: 'rgba(0, 153, 255, 0.18)', text: '#5599FF', border: '#0099FF', glow: '#5599FF' },
    3: { bg: 'rgba(0, 180, 255, 0.18)', text: '#33AAFF', border: '#00B4FF', glow: '#33AAFF' }
  };

  const colors = rankColors[rank] || {
    bg: 'rgba(255, 255, 255, 0.04)',
    text: primaryColor,
    border: primaryColor + '66',
    glow: primaryColor
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;

  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, colors.bg);
  bgGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(x, y, x + width, y);
  borderGrad.addColorStop(0, colors.border);
  borderGrad.addColorStop(0.5, colors.glow);
  borderGrad.addColorStop(1, colors.border);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = rank <= 3 ? 2.5 : 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 12);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, width - 3, height - 3, 11);
  ctx.stroke();

  const accentGrad = ctx.createLinearGradient(x, y, x, y + height);
  accentGrad.addColorStop(0, colors.text);
  accentGrad.addColorStop(1, colors.glow);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(x, y + 10, 4, height - 20);

  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = rank <= 3 ? 20 : 12;
  const rankTextGrad = ctx.createLinearGradient(x + 35, y, x + 35, y + height);
  rankTextGrad.addColorStop(0, colors.text);
  rankTextGrad.addColorStop(1, colors.glow);
  ctx.fillStyle = rankTextGrad;
  ctx.font = `bold ${rank <= 3 ? 24 : 20}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(rank.toString(), x + 35, y + height / 2 + 8);
  ctx.restore();
  ctx.textAlign = 'left';

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));
    ctx.save();
    ctx.shadowColor = colors.glow + 'AA';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x + 90, y + height / 2, 18, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x + 72, y + height / 2 - 18, 36, 36);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + 90, y + height / 2, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } catch (e) {}

  const username = member.user.username.length > 18 ? member.user.username.substring(0, 18) + '...' : member.user.username;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px Arial';
  ctx.fillText(username, x + 120, y + height / 2 + 6);

  const statValue = isMessage ? userData.totalMessages.toLocaleString() : `${(userData.totalVoiceTime / 3600000).toFixed(1)}h`;
  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 10;
  const statGrad = ctx.createLinearGradient(x + width - 200, y, x + width - 100, y + height);
  statGrad.addColorStop(0, colors.text);
  statGrad.addColorStop(1, colors.glow);
  ctx.fillStyle = statGrad;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(statValue, x + width - 120, y + height / 2 + 7);
  ctx.restore();

  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(isMessage ? 'messages' : 'voice time', x + width - 80, y + height / 2 + 7);
  ctx.textAlign = 'left';
}

function drawGlowingCard(ctx, x, y, width, height, radius, color) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, 'rgba(20, 35, 50, 0.95)');
  bgGrad.addColorStop(0.5, 'rgba(15, 25, 40, 0.9)');
  bgGrad.addColorStop(1, 'rgba(10, 20, 35, 0.95)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(x, y, x + width, y + height);
  borderGrad.addColorStop(0, color + '80');
  borderGrad.addColorStop(0.5, color + '40');
  borderGrad.addColorStop(1, color + '80');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, radius - 1);
  ctx.stroke();
}

function drawFooter(ctx, x, y, width, primaryColor, accentColor) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  const footerGrad = ctx.createLinearGradient(x, y, x + width, y);
  footerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  footerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  footerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
  ctx.fillStyle = footerGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 35, 12);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(x, y, x + width, y);
  borderGrad.addColorStop(0, primaryColor + '40');
  borderGrad.addColorStop(0.5, accentColor + '30');
  borderGrad.addColorStop(1, primaryColor + '40');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 35, 12);
  ctx.stroke();

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Powered by', x + width / 2 - 35, y + 22);

  const poweredByGrad = ctx.createLinearGradient(x + width / 2, y, x + width / 2 + 80, y + 35);
  poweredByGrad.addColorStop(0, primaryColor);
  poweredByGrad.addColorStop(0.5, accentColor);
  poweredByGrad.addColorStop(1, primaryColor);
  ctx.save();
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 15;
  ctx.fillStyle = poweredByGrad;
  ctx.font = 'bold 16px Arial';
  ctx.fillText('         Phonix', x + width / 2 + 30, y + 22);
  ctx.restore();
  ctx.textAlign = 'left';
}