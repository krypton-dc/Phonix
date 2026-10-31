const { AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const moment = require('moment');
const ServerStats = require('@data/ServerStats');

module.exports = {
    name: 'serverstats',
    aliases: ["guildstats"],
    category: "Tracker",
    description: 'Display server statistics using image',
    cooldown: 10,
    userPerms: ['ManageGuild'],
    execute: async (message, args, client) => {
        const guild = message.guild;
               const m = await message.channel.send({
  embeds: [new client.embed().d(`> ${client.emoji.loading} Loading Server Info Please Wait`)]
});
        const serverData = await ServerStats.findOne({ guildId: guild.id });
        if (!serverData) {
            return message.reply('No statistics data available yet. Please wait for data collection.');
        }

        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const stats1d = calculateStats(serverData, oneDayAgo);
        const stats7d = calculateStats(serverData, sevenDaysAgo);
        const statsTotal = calculateStats(serverData, serverData.createdAt);
        const createdDate = moment(guild.createdAt).format('DD MMMM YYYY');
        const invitedDate = moment(guild.members.me.joinedAt).format('DD MMMM YYYY');
        const lookbackDate = moment(serverData.lookbackStart || sevenDaysAgo).format('DD MMMM YYYY');
        const totalDate = moment(serverData.createdAt).format('DD/MM/YY');
        const topMessageUser = await getTopUser(serverData.userMessages, sevenDaysAgo, guild);
        const topVoiceUser = await getTopUser(serverData.userVoice, sevenDaysAgo, guild);
        const topMessageChannel = getTopChannel(serverData.channelMessages, sevenDaysAgo, guild);
        const topVoiceChannel = getTopChannel(serverData.channelVoice, sevenDaysAgo, guild);

        const canvas = Canvas.createCanvas(1280, 950);
        const ctx = canvas.getContext('2d');

        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, '#0a0a0a');
        bgGradient.addColorStop(0.5, '#121212');
        bgGradient.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawFloatingShapes(ctx, canvas.width, canvas.height);

        drawModernCard(ctx, 30, 20, 1220, 100, 20);

        let iconLoaded = false;
        if (guild.iconURL()) {
            try {
                const icon = await Canvas.loadImage(guild.iconURL({ extension: 'png', size: 128 }));
                ctx.save();
                ctx.beginPath();
                ctx.arc(80, 70, 40, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(icon, 40, 30, 80, 80);
                ctx.restore();
                ctx.shadowColor = 'rgba(120, 255, 214, 0.6)';
                ctx.shadowBlur = 25;
                ctx.strokeStyle = 'rgba(120, 255, 214, 0.4)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(80, 70, 42, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
                iconLoaded = true;
            } catch (err) {
                iconLoaded = false;
            }
        }

        if (!iconLoaded) {
            const gradient = ctx.createLinearGradient(40, 30, 120, 110);
            gradient.addColorStop(0, '#78FFD6');
            gradient.addColorStop(1, '#5865F2');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(80, 70, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(guild.name.charAt(0).toUpperCase(), 80, 70);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px Arial';
        const guildNameText = guild.name.length > 20 ? guild.name.substring(0, 20) + '...' : guild.name;
        ctx.fillText(guildNameText, 140, 62);
        ctx.font = '18px Arial';
        ctx.fillStyle = '#A0A0A0';
        ctx.fillText('Server Overview', 140, 92);

        drawModernCard(ctx, 730, 35, 250, 70, 12);
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '13px Arial';
        ctx.fillText('Created On', 750, 57);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(createdDate, 750, 82);

        drawModernCard(ctx, 1000, 35, 250, 70, 12);
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '13px Arial';
        ctx.fillText('Bot Joined', 1020, 57);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(invitedDate, 1020, 82);

        let yPos = 140;

        drawNeonStatBox(ctx, 30, yPos, 390, 190, 'message', 'Messages', [
            { label: '1d', value: formatNumber(stats1d.messages), unit: 'messages' },
            { label: '7d', value: formatNumber(stats7d.messages), unit: 'messages' },
            { label: 'Total', value: formatNumber(statsTotal.messages), unit: 'messages' }
        ], '#78FFD6');

        drawNeonStatBox(ctx, 445, yPos, 390, 190, 'voice', 'Voice Activity', [
            { label: '1d', value: formatHours(stats1d.voice), unit: 'hours' },
            { label: '7d', value: formatHours(stats7d.voice), unit: 'hours' },
            { label: 'Total', value: formatHours(statsTotal.voice), unit: 'hours' }
        ], '#A78BFA');

        drawNeonStatBox(ctx, 860, yPos, 390, 190, 'contributors', 'Contributors', [
            { label: '1d', value: stats1d.contributors.toString(), unit: 'members' },
            { label: '7d', value: stats7d.contributors.toString(), unit: 'members' },
            { label: 'Total', value: statsTotal.contributors.toString(), unit: 'members' }
        ], '#FB923C');

        yPos += 215;

        await drawNeonTopBox(ctx, 30, yPos, 600, 140, 'Top Members', [
            { type: 'message', name: topMessageUser.name, value: formatNumber(topMessageUser.count), unit: 'messages', avatar: topMessageUser.avatar },
            { type: 'voice', name: topVoiceUser.name, value: formatHours(topVoiceUser.count), unit: 'hours', avatar: topVoiceUser.avatar }
        ], guild);

        drawNeonTopBox(ctx, 650, yPos, 600, 140, 'Top Channels', [
            { type: 'message', name: topMessageChannel.name, value: formatNumber(topMessageChannel.count), unit: 'messages' },
            { type: 'voice', name: topVoiceChannel.name, value: formatHours(topVoiceChannel.count), unit: 'hours' }
        ], guild);

        yPos += 165;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Activity Charts', 30, yPos);

        const chartData = generateChartData(serverData, sevenDaysAgo);
        drawSmoothChart(ctx, 30, yPos + 15, 1220, 300, chartData);

        drawModernCard(ctx, 30, canvas.height - 55, 1220, 40, 12);
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '13px Arial';
        ctx.fillText(`Server Lookback: Since ${lookbackDate} • Timezone: IST`, 50, canvas.height - 27);
        ctx.fillStyle = '#78FFD6';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Powered by Phonix', canvas.width - 200, canvas.height - 27);

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'serverstats.png' });

await m.edit({
  files: [attachment],
  embeds: []
});

    }
};

function drawFloatingShapes(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.04;

    const shapes = [
        { x: 150, y: 200, r: 80, type: 'circle' },
        { x: 900, y: 150, r: 60, type: 'circle' },
        { x: 1100, y: 700, r: 100, type: 'circle' },
        { x: 250, y: 800, r: 70, type: 'circle' },
        { x: 600, y: 500, size: 90, type: 'square' },
        { x: 400, y: 300, size: 50, type: 'square' },
        { x: 1000, y: 450, size: 70, type: 'square' }
    ];

    const gradient1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    gradient1.addColorStop(0, '#78FFD6');
    gradient1.addColorStop(1, 'transparent');

    const gradient2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    gradient2.addColorStop(0, '#A78BFA');
    gradient2.addColorStop(1, 'transparent');

    shapes.forEach((shape, i) => {
        if (shape.type === 'circle') {
            ctx.fillStyle = i % 2 === 0 ? gradient1 : gradient2;
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.beginPath();
            ctx.arc(0, 0, shape.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = i % 2 === 0 ? gradient2 : gradient1;
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
            ctx.restore();
        }
    });

    ctx.restore();
}

function drawModernCard(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(30, 30, 30, 0.6)';
    roundRect(ctx, x, y, width, height, radius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const borderGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    borderGradient.addColorStop(0, 'rgba(120, 255, 214, 0.3)');
    borderGradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.3)');
    borderGradient.addColorStop(1, 'rgba(251, 146, 60, 0.3)');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, width, height, radius);
    ctx.stroke();
    ctx.restore();
}

function drawIconShape(ctx, x, y, type, color) {
    ctx.save();
    ctx.fillStyle = color + '30';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    if (type === 'message') {
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 8);
        ctx.lineTo(x + 12, y - 8);
        ctx.lineTo(x + 12, y + 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.lineTo(x, y + 10);
        ctx.lineTo(x - 4, y + 4);
        ctx.lineTo(x - 12, y + 4);
        ctx.closePath();
        ctx.fill();
    } else if (type === 'voice') {
        ctx.beginPath();
        ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 2, y, 4, 8);
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 8);
        ctx.quadraticCurveTo(x - 8, y + 2, x - 2, y + 2);
        ctx.moveTo(x + 8, y + 8);
        ctx.quadraticCurveTo(x + 8, y + 2, x + 2, y + 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.fillRect(x - 6, y + 12, 12, 2);
    } else if (type === 'contributors') {
        ctx.beginPath();
        ctx.arc(x, y - 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y + 10, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawNeonStatBox(ctx, x, y, width, height, iconType, title, stats, accentColor) {
    drawModernCard(ctx, x, y, width, height, 18);

    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, accentColor);
    gradient.addColorStop(1, accentColor + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, 4);

    drawIconShape(ctx, x + 40, y + 45, iconType, accentColor);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(title, x + 80, y + 50);

    let textY = y + 95;
    stats.forEach((stat, index) => {
        if (index % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(x + 20, textY - 22, width - 40, 38);
        }

        ctx.fillStyle = '#A0A0A0';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(stat.label, x + 35, textY);

        ctx.fillStyle = accentColor;
        ctx.font = 'bold 22px Arial';
        const valueWidth = ctx.measureText(stat.value).width;
        ctx.fillText(stat.value, x + 110, textY);

        ctx.fillStyle = '#707070';
        ctx.font = '14px Arial';
        ctx.fillText(stat.unit, x + 110 + valueWidth + 8, textY);

        textY += 38;
    });
}

async function drawNeonTopBox(ctx, x, y, width, height, title, items, guild) {
    drawModernCard(ctx, x, y, width, height, 18);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(title, x + 30, y + 35);

    let textY = y + 85;
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const xOffset = index === 0 ? x + 30 : x + width / 2 + 20;

        if (item.avatar) {
            try {
                const avatar = await Canvas.loadImage(item.avatar);
                ctx.save();
                ctx.beginPath();
                ctx.arc(xOffset + 22, textY - 5, 22, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, xOffset, textY - 27, 44, 44);
                ctx.restore();
                ctx.strokeStyle = 'rgba(120, 255, 214, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(xOffset + 22, textY - 5, 23, 0, Math.PI * 2);
                ctx.stroke();
            } catch (err) {
                const gradient = ctx.createLinearGradient(xOffset, textY - 27, xOffset + 44, textY + 17);
                gradient.addColorStop(0, '#78FFD6');
                gradient.addColorStop(1, '#5865F2');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(xOffset + 22, textY - 5, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.name.charAt(0).toUpperCase(), xOffset + 22, textY - 5);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
            }
        } else {
            const iconColor = item.type === 'message' ? '#78FFD6' : '#A78BFA';
            drawIconShape(ctx, xOffset + 22, textY - 5, item.type, iconColor);
        }

        const labelX = xOffset + 54;
        const labelY = textY - 8;

        ctx.fillStyle = '#707070';
        ctx.font = '12px Arial';
        const labelText = item.type === 'message' ? 'Messages' : 'Voice';
        ctx.fillText(labelText, labelX, labelY);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 17px Arial';
        const nameText = item.name.length > 13 ? item.name.substring(0, 13) + '...' : item.name;
        ctx.fillText(nameText, labelX, labelY + 20);

        const valueColor = item.type === 'message' ? '#78FFD6' : '#A78BFA';
        ctx.fillStyle = valueColor;
        ctx.font = 'bold 16px Arial';
        const valueWidth = ctx.measureText(item.value).width;
        ctx.fillText(item.value, labelX, labelY + 42);

        ctx.fillStyle = '#707070';
        ctx.font = '12px Arial';
        ctx.fillText(item.unit, labelX + valueWidth + 6, labelY + 42);
    }
}

function drawSmoothChart(ctx, x, y, width, height, data) {
    drawModernCard(ctx, x, y, width, height, 18);

    if (!data.messages.length) return;

    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxMsg = Math.max(...data.messages, 1);
    const maxVoice = Math.max(...data.voice, 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const yPos = y + padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x + padding, yPos);
        ctx.lineTo(x + width - padding, yPos);
        ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(120, 255, 214, 0.6)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#78FFD6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const msgPoints = data.messages.map((val, i) => ({
        x: x + padding + (i / Math.max(data.messages.length - 1, 1)) * chartWidth,
        y: y + padding + chartHeight - (val / maxMsg) * chartHeight
    }));

    if (msgPoints.length > 0) {
        ctx.moveTo(msgPoints[0].x, msgPoints[0].y);
        for (let i = 0; i < msgPoints.length - 1; i++) {
            const xc = (msgPoints[i].x + msgPoints[i + 1].x) / 2;
            const yc = (msgPoints[i].y + msgPoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(msgPoints[i].x, msgPoints[i].y, xc, yc);
        }
        if (msgPoints.length > 1) {
            ctx.lineTo(msgPoints[msgPoints.length - 1].x, msgPoints[msgPoints.length - 1].y);
        }
    }
    ctx.stroke();

    ctx.lineTo(x + width - padding, y + height - padding);
    ctx.lineTo(x + padding, y + height - padding);
    ctx.closePath();
    const msgFillGradient = ctx.createLinearGradient(0, y + padding, 0, y + height - padding);
    msgFillGradient.addColorStop(0, 'rgba(120, 255, 214, 0.25)');
    msgFillGradient.addColorStop(1, 'rgba(120, 255, 214, 0)');
    ctx.fillStyle = msgFillGradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(167, 139, 250, 0.6)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const voicePoints = data.voice.map((val, i) => ({
        x: x + padding + (i / Math.max(data.voice.length - 1, 1)) * chartWidth,
        y: y + padding + chartHeight - (val / maxVoice) * chartHeight
    }));

    if (voicePoints.length > 0) {
        ctx.moveTo(voicePoints[0].x, voicePoints[0].y);
        for (let i = 0; i < voicePoints.length - 1; i++) {
            const xc = (voicePoints[i].x + voicePoints[i + 1].x) / 2;
            const yc = (voicePoints[i].y + voicePoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(voicePoints[i].x, voicePoints[i].y, xc, yc);
        }
        if (voicePoints.length > 1) {
            ctx.lineTo(voicePoints[voicePoints.length - 1].x, voicePoints[voicePoints.length - 1].y);
        }
    }
    ctx.stroke();

    ctx.lineTo(x + width - padding, y + height - padding);
    ctx.lineTo(x + padding, y + height - padding);
    ctx.closePath();
    const voiceFillGradient = ctx.createLinearGradient(0, y + padding, 0, y + height - padding);
    voiceFillGradient.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
    voiceFillGradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
    ctx.fillStyle = voiceFillGradient;
    ctx.fill();
    ctx.restore();

    drawModernCard(ctx, x + width - 295, y + 15, 130, 38, 10);
ctx.fillStyle = '#78FFD6';
ctx.beginPath();
ctx.arc(x + width - 267, y + 34, 6, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#FFFFFF';
ctx.font = 'bold 15px Arial';
ctx.fillText('Messages', x + width - 252, y + 39);

drawModernCard(ctx, x + width - 155, y + 15, 90, 38, 10);
ctx.fillStyle = '#A78BFA';
ctx.beginPath();
ctx.arc(x + width - 140, y + 34, 6, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#FFFFFF';
ctx.fillText('Voice', x + width - 125, y + 39);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function calculateStats(data, startTime) {
    const messages = data.messageHistory.filter(m => m.timestamp >= startTime).reduce((a, b) => a + b.count, 0);
    const voice = data.voiceHistory.filter(v => v.timestamp >= startTime).reduce((a, b) => a + b.duration, 0);
    const contributorsSet = new Set();
    data.messageHistory.filter(m => m.timestamp >= startTime).forEach(m => contributorsSet.add(m.userId));
    data.voiceHistory.filter(v => v.timestamp >= startTime).forEach(v => contributorsSet.add(v.userId));
    return { messages, voice, contributors: contributorsSet.size, period: startTime };
}

async function getTopUser(userMap, period, guild) {
    if (!userMap) return { name: 'N/A', count: 0, avatar: null };

    // Convert object → iterable entries
    const entries = userMap instanceof Map
        ? userMap.entries()
        : Object.entries(userMap);

    let topUser = null;
    let maxCount = 0;

    for (const [userId, data] of entries) {
        if (!data?.history) continue;

        const count = data.history
            .filter(h => h.timestamp >= period)
            .reduce((a, b) => a + (b.value || 0), 0);

        if (count > maxCount) {
            maxCount = count;
            topUser = userId;
        }
    }

    if (!topUser) return { name: 'N/A', count: 0, avatar: null };

    try {
        const member = await guild.members.fetch(topUser);
        return {
            name: member.user.username,
            count: maxCount,
            avatar: member.user.displayAvatarURL({ extension: 'png', size: 128 })
        };
    } catch {
        return {
            name: userMap[topUser]?.username || 'Unknown',
            count: maxCount,
            avatar: null
        };
    }
}


function getTopChannel(channelMap, period, guild) {
    if (!channelMap) return { name: 'N/A', count: 0 };

    const entries = channelMap instanceof Map
        ? channelMap.entries()
        : Object.entries(channelMap);

    let topChannel = null;
    let maxCount = 0;

    for (const [channelId, data] of entries) {
        if (!data?.history) continue;

        const count = data.history
            .filter(h => h.timestamp >= period)
            .reduce((a, b) => a + (b.value || 0), 0);

        if (count > maxCount) {
            maxCount = count;
            topChannel = channelId;
        }
    }

    if (!topChannel) return { name: 'N/A', count: 0 };

    const channel = guild.channels.cache.get(topChannel);

    return {
        name: channel?.name || channelMap[topChannel]?.name || 'Unknown',
        count: maxCount
    };
}


function generateChartData(data, startTime) {
    const days = 7;
    const messages = new Array(days * 24).fill(0);
    const voice = new Array(days * 24).fill(0);
    data.messageHistory.filter(m => m.timestamp >= startTime).forEach(m => {
        const hourIndex = Math.floor((Date.now() - m.timestamp) / (1000 * 60 * 60));
        if (hourIndex < messages.length) messages[messages.length - 1 - hourIndex] += m.count;
    });
    data.voiceHistory.filter(v => v.timestamp >= startTime).forEach(v => {
        const hourIndex = Math.floor((Date.now() - v.timestamp) / (1000 * 60 * 60));
        if (hourIndex < voice.length) voice[voice.length - 1 - hourIndex] += v.duration / (1000 * 60 * 60);
    });
    return { messages, voice };
}

function formatHours(milliseconds) {
    const hours = milliseconds / (1000 * 60 * 60);
    return hours >= 100 ? hours.toFixed(0) : hours.toFixed(2);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}