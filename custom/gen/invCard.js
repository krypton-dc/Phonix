// createInviteBanner.js
const { createCanvas, loadImage, registerFont } = require("@napi-rs/canvas");

// registerFont("./assets/YourFont.ttf", { family: "CustomFont" });

async function createInviteBanner(bot, userCount, serverCount) {
  const width = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // --- Card Background with gradient ---
  const radius = 25;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();

  // Base fill
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, "#0f172a");
  bgGradient.addColorStop(1, "#1e293b");
  ctx.fillStyle = bgGradient;
  ctx.fill();

  // Edge glow
  const edgeGradient = ctx.createLinearGradient(0, 0, width, height);
  edgeGradient.addColorStop(0, "rgba(255,255,255,0.05)");
  edgeGradient.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = edgeGradient;
  ctx.fill();

  // --- Avatar ---
  const avatarURL = bot.displayAvatarURL({ size: 256, extension: "png" });
  const avatar = await loadImage(avatarURL);
  const avatarSize = 110;
  const avatarX = 45;
  const avatarY = height / 2 - avatarSize / 2;

  // Glow behind avatar
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // Draw avatar circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // White border
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  // --- Text ---
  const textX = avatarX + avatarSize + 35;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;

  // Bot name
  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(bot.username, textX, height / 2 - 18);

  // Stats
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(
    `With ${userCount}+ Users, at ${serverCount} servers`,
    textX,
    height / 2 + 15
  );

  ctx.shadowBlur = 0; // remove for button

  // --- Button ---
  const buttonWidth = 470;
  const buttonHeight = 44;
  const buttonX = textX;
  const buttonY = height - buttonHeight - 25;

  // Button glow
  ctx.save();
  ctx.shadowColor = "rgba(59,130,246,0.7)";
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
  ctx.fillStyle = "#3b82f6"; // Blue
  ctx.fill();
  ctx.restore();

  // Button text
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(
    `Click Button Below to Invite ${bot.username} to Your Server`,
    buttonX + 15,
    buttonY + 28
  );

  return canvas.toBuffer("image/png");
}

module.exports = { createInviteBanner };
