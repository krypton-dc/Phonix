const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const UserStats = require('@data/UserStats');

module.exports = {
    name: 'userstats',
    aliases: ['ustats', 'profile', 'me'],
    category: "Tracker",
    description: 'Display user statistics using image',
    cooldown: 10,
    execute: async (message, args, client) => {
        const targetUser = message.mentions.users.first() || message.author;
        const member = await message.guild.members.fetch(targetUser.id);

        const userStats = await UserStats.findOne({ 
            userId: targetUser.id, 
            guildId: message.guild.id 
        });

        if (!userStats) {
            return message.reply('No stats found for this user.');
        }

               const m = await message.channel.send({
  embeds: [new client.embed().d(`> ${client.emoji.loading} Loading Server Info Please Wait`)]
});
        const allUsers = await UserStats.find({ guildId: message.guild.id }).sort({ totalMessages: -1 });
        const messageRank = allUsers.findIndex(u => u.userId === targetUser.id) + 1;
        
        const voiceUsers = await UserStats.find({ guildId: message.guild.id }).sort({ totalVoiceTime: -1 });
        const voiceRank = voiceUsers.findIndex(u => u.userId === targetUser.id) + 1;

        const last7Days = userStats.dailyActivity
            .filter(d => d.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .reduce((acc, d) => ({ 
                messages: acc.messages + d.messages, 
                voiceTime: acc.voiceTime + d.voiceTime 
            }), { messages: 0, voiceTime: 0 });

        const last30Days = userStats.dailyActivity
            .filter(d => d.date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((acc, d) => ({ 
                messages: acc.messages + d.messages, 
                voiceTime: acc.voiceTime + d.voiceTime 
            }), { messages: 0, voiceTime: 0 });

        const canvas = createCanvas(1000, 550);
        const ctx = canvas.getContext('2d');

        const bgGradient = ctx.createLinearGradient(0, 0, 1000, 550);
        bgGradient.addColorStop(0, '#000000');
        bgGradient.addColorStop(0.5, '#0a0a0a');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, 1000, 550);

        drawBackgroundShapes(ctx);

        drawGlassCard(ctx, 20, 20, 960, 110, 18);

        const userAvatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 128 }));
        
        ctx.save();
        ctx.shadowColor = 'rgba(78, 236, 163, 0.6)';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(80, 75, 45, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(userAvatar, 35, 30, 90, 90);
        ctx.restore();

        const ringGradient = ctx.createLinearGradient(35, 30, 125, 120);
        ringGradient.addColorStop(0, '#4ECCA3');
        ringGradient.addColorStop(1, '#78FFD6');
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(80, 75, 48, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 34px Arial';
        ctx.fillText(targetUser.username, 155, 65);
        
        const memberSince = Math.floor((Date.now() - member.joinedAt) / (1000 * 60 * 60 * 24));
        ctx.fillStyle = '#8B8B8B';
        ctx.font = '15px Arial';
        ctx.fillText(`Member for ${memberSince} days  •  Last active ${getTimeAgo(userStats.lastActive)}`, 155, 95);

        drawStatusBadge(ctx, 870, 45, 'ACTIVE');

        drawGlassCard(ctx, 20, 150, 630, 380, 18);
        
        drawIconCircle(ctx, 45, 180, 12, '#4ECCA3');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px Arial';
        ctx.fillText('Activity Overview', 70, 191);
        
        ctx.fillStyle = '#6B7280';
        ctx.font = '14px Arial';
        ctx.fillText('Performance metrics over the last 14 days', 70, 213);

        drawAdvancedChart(ctx, 40, 235, 590, 275, userStats.dailyActivity.slice(-14));

        drawGlassCard(ctx, 670, 150, 310, 185, 18);
        
        drawIconSquare(ctx, 695, 180, 12, '#A78BFA');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Server Rankings', 720, 191);

        drawAdvancedRankCard(ctx, 690, 215, 270, 55, 'Messages', `#${messageRank}`, userStats.totalMessages.toLocaleString(), '#4ECCA3', allUsers.length);
        drawAdvancedRankCard(ctx, 690, 280, 270, 55, 'Voice Time', `#${voiceRank}`, `${(userStats.totalVoiceTime / 3600000).toFixed(1)}h`, '#A78BFA', voiceUsers.length);

        drawGlassCard(ctx, 670, 355, 310, 175, 18);
        
        drawIconDiamond(ctx, 695, 385, 12, '#78FFD6');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Recent Activity', 720, 396);

        drawStatRow(ctx, 690, 425, 270, '7 Day Messages', last7Days.messages.toLocaleString(), '#4ECCA3');
        drawStatRow(ctx, 690, 465, 270, '7 Day Voice', `${(last7Days.voiceTime / 3600000).toFixed(1)} hours`, '#A78BFA');
        drawStatRow(ctx, 690, 505, 270, '30 Day Total', `${last30Days.messages.toLocaleString()} msgs`, '#78FFD6');

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'userstats.png' });
        await m.edit({ embeds: [], files: [attachment] });
    }
};

function drawBackgroundShapes(ctx) {
    ctx.globalAlpha = 0.03;
    
    ctx.fillStyle = '#4ECCA3';
    ctx.beginPath();
    ctx.arc(150, 100, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#A78BFA';
    ctx.beginPath();
    ctx.arc(850, 450, 120, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#78FFD6';
    ctx.save();
    ctx.translate(900, 100);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-40, -40, 80, 80);
    ctx.restore();
    
    ctx.fillStyle = '#4ECCA3';
    ctx.save();
    ctx.translate(100, 450);
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(-50, -50, 100, 100);
    ctx.restore();
    
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(500, 500, 60, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = '#78FFD6';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = 800 + Math.cos(angle) * 40;
        const y = 250 + Math.sin(angle) * 40;
        if (i === 0) ctx.beginPath();
        ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    
    ctx.globalAlpha = 1;
}

function drawGlassCard(ctx, x, y, width, height, radius) {
    ctx.save();
    
    ctx.shadowColor = 'rgba(78, 236, 163, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    
    const cardGradient = ctx.createLinearGradient(x, y, x, y + height);
    cardGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    cardGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    
    ctx.fillStyle = cardGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    
    const borderGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    borderGradient.addColorStop(0, 'rgba(78, 236, 163, 0.3)');
    borderGradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.3)');
    borderGradient.addColorStop(1, 'rgba(120, 255, 214, 0.3)');
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.restore();
}

function drawStatusBadge(ctx, x, y, text) {
    const badgeGradient = ctx.createLinearGradient(x, y - 15, x + 100, y + 15);
    badgeGradient.addColorStop(0, 'rgba(78, 236, 163, 0.2)');
    badgeGradient.addColorStop(1, 'rgba(120, 255, 214, 0.2)');
    
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.roundRect(x, y - 15, 100, 30, 8);
    ctx.fill();
    
    ctx.strokeStyle = '#4ECCA3';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.fillStyle = '#4ECCA3';
    ctx.beginPath();
    ctx.arc(x + 15, y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(text, x + 28, y + 5);
}

function drawIconCircle(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size + 5, 0, Math.PI * 2);
    ctx.stroke();
}

function drawIconSquare(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10);
    ctx.restore();
}

function drawIconDiamond(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - size - 5);
    ctx.lineTo(x + size + 5, y);
    ctx.lineTo(x, y + size + 5);
    ctx.lineTo(x - size - 5, y);
    ctx.closePath();
    ctx.stroke();
}

function drawAdvancedRankCard(ctx, x, y, width, height, label, rank, total, color, totalUsers) {
    const percentage = ((totalUsers - parseInt(rank.replace('#', '')) + 1) / totalUsers * 100);
    
    const bgGradient = ctx.createLinearGradient(x, y, x + width, y);
    bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();

    const progressGradient = ctx.createLinearGradient(x, y, x + width, y);
    progressGradient.addColorStop(0, color);
    progressGradient.addColorStop(1, color + '50');
    ctx.fillStyle = progressGradient;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.roundRect(x, y, (width * percentage / 100), height, 12);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    const iconGradient = ctx.createRadialGradient(x + 18, y + height / 2, 0, x + 18, y + height / 2, 8);
    iconGradient.addColorStop(0, color);
    iconGradient.addColorStop(1, color + '80');
    ctx.fillStyle = iconGradient;
    ctx.beginPath();
    ctx.arc(x + 18, y + height / 2, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(label, x + 38, y + height / 2 + 6);

    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = color;
    ctx.fillText(rank, x + width - 130, y + height / 2 + 7);

    ctx.fillStyle = '#7B7B7B';
    ctx.font = '14px Arial';
    ctx.fillText(total, x + width - 80, y + height / 2 + 5);
}

function drawStatRow(ctx, x, y, width, label, value, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 8, 4, 18);

    ctx.fillStyle = '#A0A0A0';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(label, x + 15, y + 5);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(value, x + width - ctx.measureText(value).width, y + 5);
}

function drawAdvancedChart(ctx, x, y, width, height, data) {
    const days = 14;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 20;
    const pointSpacing = chartWidth / (days - 1);

    const filledData = [];
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        date.setHours(0, 0, 0, 0);
        
        const found = data.find(d => new Date(d.date).toDateString() === date.toDateString());
        filledData.push(found || { date, messages: 0, voiceTime: 0 });
    }

    const maxMessages = Math.max(...filledData.map(d => d.messages), 10);
    const maxVoice = Math.max(...filledData.map(d => d.voiceTime / 3600000), 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    for (let i = 0; i <= 4; i++) {
        const gridY = y + padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x + padding, gridY);
        ctx.lineTo(x + width - padding, gridY);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    const messagePoints = filledData.map((d, i) => ({
        x: x + padding + i * pointSpacing,
        y: y + padding + chartHeight - (d.messages / maxMessages) * chartHeight
    }));

    const msgGradient = ctx.createLinearGradient(0, y + padding, 0, y + height - padding);
    msgGradient.addColorStop(0, 'rgba(78, 236, 163, 0.4)');
    msgGradient.addColorStop(1, 'rgba(78, 236, 163, 0)');
    
    ctx.beginPath();
    ctx.moveTo(messagePoints[0].x, y + height - padding - 20);
    ctx.lineTo(messagePoints[0].x, messagePoints[0].y);
    
    for (let i = 1; i < messagePoints.length; i++) {
        const xMid = (messagePoints[i - 1].x + messagePoints[i].x) / 2;
        const yMid = (messagePoints[i - 1].y + messagePoints[i].y) / 2;
        const cpX1 = (xMid + messagePoints[i - 1].x) / 2;
        const cpX2 = (xMid + messagePoints[i].x) / 2;
        ctx.quadraticCurveTo(cpX1, messagePoints[i - 1].y, xMid, yMid);
        ctx.quadraticCurveTo(cpX2, messagePoints[i].y, messagePoints[i].x, messagePoints[i].y);
    }
    
    ctx.lineTo(messagePoints[messagePoints.length - 1].x, y + height - padding - 20);
    ctx.closePath();
    ctx.fillStyle = msgGradient;
    ctx.fill();

    ctx.strokeStyle = '#4ECCA3';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(78, 236, 163, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(messagePoints[0].x, messagePoints[0].y);
    
    for (let i = 1; i < messagePoints.length; i++) {
        const xMid = (messagePoints[i - 1].x + messagePoints[i].x) / 2;
        const yMid = (messagePoints[i - 1].y + messagePoints[i].y) / 2;
        const cpX1 = (xMid + messagePoints[i - 1].x) / 2;
        const cpX2 = (xMid + messagePoints[i].x) / 2;
        ctx.quadraticCurveTo(cpX1, messagePoints[i - 1].y, xMid, yMid);
        ctx.quadraticCurveTo(cpX2, messagePoints[i].y, messagePoints[i].x, messagePoints[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    messagePoints.forEach((point, i) => {
        if (filledData[i].messages > 0) {
            const dotGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 6);
            dotGradient.addColorStop(0, '#4ECCA3');
            dotGradient.addColorStop(1, '#78FFD6');
            
            ctx.fillStyle = dotGradient;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    const voicePoints = filledData.map((d, i) => ({
        x: x + padding + i * pointSpacing,
        y: y + padding + chartHeight - ((d.voiceTime / 3600000) / maxVoice) * chartHeight
    }));

    const voiceGradient = ctx.createLinearGradient(0, y + padding, 0, y + height - padding);
    voiceGradient.addColorStop(0, 'rgba(167, 139, 250, 0.4)');
    voiceGradient.addColorStop(1, 'rgba(167, 139, 250, 0)');
    
    ctx.beginPath();
    ctx.moveTo(voicePoints[0].x, y + height - padding - 20);
    ctx.lineTo(voicePoints[0].x, voicePoints[0].y);
    
    for (let i = 1; i < voicePoints.length; i++) {
        const xMid = (voicePoints[i - 1].x + voicePoints[i].x) / 2;
        const yMid = (voicePoints[i - 1].y + voicePoints[i].y) / 2;
        const cpX1 = (xMid + voicePoints[i - 1].x) / 2;
        const cpX2 = (xMid + voicePoints[i].x) / 2;
        ctx.quadraticCurveTo(cpX1, voicePoints[i - 1].y, xMid, yMid);
        ctx.quadraticCurveTo(cpX2, voicePoints[i].y, voicePoints[i].x, voicePoints[i].y);
    }
    
    ctx.lineTo(voicePoints[voicePoints.length - 1].x, y + height - padding - 20);
    ctx.closePath();
    ctx.fillStyle = voiceGradient;
    ctx.fill();

    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(167, 139, 250, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(voicePoints[0].x, voicePoints[0].y);
    
    for (let i = 1; i < voicePoints.length; i++) {
        const xMid = (voicePoints[i - 1].x + voicePoints[i].x) / 2;
        const yMid = (voicePoints[i - 1].y + voicePoints[i].y) / 2;
        const cpX1 = (xMid + voicePoints[i - 1].x) / 2;
        const cpX2 = (xMid + voicePoints[i].x) / 2;
        ctx.quadraticCurveTo(cpX1, voicePoints[i - 1].y, xMid, yMid);
        ctx.quadraticCurveTo(cpX2, voicePoints[i].y, voicePoints[i].x, voicePoints[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    voicePoints.forEach((point, i) => {
        if (filledData[i].voiceTime > 0) {
            const dotGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 6);
            dotGradient.addColorStop(0, '#A78BFA');
            dotGradient.addColorStop(1, '#C4B5FD');
            
            ctx.fillStyle = dotGradient;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    const legendY = y + height - 10;
    
    ctx.fillStyle = '#4ECCA3';
    ctx.beginPath();
    ctx.arc(x + padding + 80, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Messages', x + padding + 92, legendY + 4);

    ctx.fillStyle = '#A78BFA';
    ctx.beginPath();
    ctx.arc(x + padding + 200, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Voice Time', x + padding + 212, legendY + 4);
}

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    return 'just now';
}