const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const path = require('path');

try {
    registerFont(path.join(__dirname, '../../custom/fonts/Signatra.ttf'), { family: 'Signatra' });
} catch (error) {
    console.warn("Could not register custom font. Using default 'sans-serif'. Make sure the font file exists.");
}

async function createShipImage(user1, user2, percent) {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    const backgroundPaths = [
        '../../custom/img/ship/ship.jpg',
        '../../custom/img/ship/ship.png',
        '../../custom/img/ship/ship2.jpeg',
        '../../custom/img/ship/ship3.jpg',
    ];
    const randomBgPath = backgroundPaths[Math.floor(Math.random() * backgroundPaths.length)];
    const background = await loadImage(path.join(__dirname, randomBgPath)); 
    const placeholderAvatarURL = 'https://i.imgur.com/80721rT.png';
    const loadAvatar = async (user) => {
        try {
            return await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
        } catch (error) {
            console.error(`Failed to load avatar for ${user.username}. Using placeholder.`, error);
            return await loadImage(placeholderAvatarURL);
        }
    };

    const avatar1 = await loadAvatar(user1);
    const avatar2 = await loadAvatar(user2);
    const heart = await loadImage('https://i.imgur.com/561sS8f.png');
    const brokenHeart = await loadImage('https://i.imgur.com/jB3p5bO.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar1, 100, 100, 200, 200);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(600, 200, 100, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar2, 500, 100, 200, 200);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = "60px LilitaOne, sans-serif";
    ctx.fillText(`${percent}%`, 400, 225);
    ctx.font = "40px LilitaOne, sans-serif";
    ctx.fillText(user1.username, 200, 340);
    ctx.fillText('&', 400, 340);
    ctx.fillText(user2.username, 600, 340);

    return canvas.toBuffer();
}
module.exports = {
    name: "ship",
    aliases: ["love"],
    category: "Fun",
    description: "Ships two users together, with random options.",
    usage: "ship <@user1|random> [@user2|random]",
    userPerms: [],
    owner: false, 
    args: true,
    cooldown: 5,
    execute: async (message, args, client) => {
        try {
            let user1, user2;
            const mentions = [...message.mentions.users.values()];
            const wantsRandom = args.some(arg => arg.toLowerCase() === 'random');

            if (mentions.length === 2) {
                user1 = mentions[0];
                user2 = mentions[1];
            } else if (mentions.length === 1) {
                user1 = mentions[0];
                if (wantsRandom) {
                    await message.guild.members.fetch({ force: true });
                    const members = message.guild.members.cache.filter(m => !m.user.bot && m.id !== user1.id);
                    if (members.size < 1) return message.reply(`There's no one else to ship ${user1.username} with!`);
                    user2 = members.random().user;
                } else {
                    user2 = message.author;
                }
            } else if (wantsRandom) {
                await message.guild.members.fetch({ force: true });
                const members = message.guild.members.cache.filter(m => !m.user.bot);
                if (members.size < 2) return message.reply("Not enough users in this server to ship randomly!");
                
                const randomArgs = args.filter(arg => arg.toLowerCase() === 'random').length;
                if (randomArgs >= 2) {
                    const [rnd1, rnd2] = members.random(2);
                    user1 = rnd1.user;
                    user2 = rnd2.user;
                } else {
                    user1 = message.author;
                    const randomMember = members.filter(m => m.id !== user1.id).random();
                    user2 = randomMember.user;
                }
            } else {
                return message.reply("💔 Please mention one or two users, or use the `random` keyword.\n**Usage:** `ship <@user1> [@user2|random]` or `ship random [random]`");
            }
            if (user1.id === user2.id) {
                return message.reply("😂 You can't ship someone with themselves!");
            }
             if (user1.bot || user2.bot) {
                return message.reply("🤖 Bots don't have feelings... yet. You can't ship them!");
            }
            const workingMsg = await message.reply('💖 Calculating love... please wait...');
            const percent = Math.floor(Math.random() * 101);
            const shipName = user1.username.substring(0, user1.username.length / 2) + user2.username.substring(user2.username.length / 2);
            let title, description;
            if (percent > 80) {
                title = `💞 A Perfect Match for ${shipName}! 💞`;
                description = `With **${percent}%** compatibility, **${user1.username}** and **${user2.username}** are absolutely destined to be together!`;
            } else if (percent >= 50) {
                title = `💕 A Good Match! 💕`;
                description = `With **${percent}%** compatibility, there's a real spark between **${user1.username}** and **${user2.username}**!`;
            } else {
                title = `💔 Not a Great Match... 💔`;
                description = `With only **${percent}%** compatibility, **${user1.username}** and **${user2.username}** are probably better off as friends.`;
            }
            const imageBuffer = await createShipImage(user1, user2, percent);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'ship.png' });

            const embed = client.box()
                .text(title)
                .sep()
                .text(description)
                .media('attachment://ship.png')
                .text(`Req By: ${message.author.username}`)
            await workingMsg.edit({ content: null, components: [embed], files: [attachment], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error("Error in ship command:", error);
            message.reply("😭 An error occurred while creating the ship image. Please try again later.");
        }
    }
};

