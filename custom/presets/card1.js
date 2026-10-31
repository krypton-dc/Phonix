const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("node:path");

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;

  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function extractDominantColor(imageData) {
  const data = imageData.data;
  const colorCounts = {};
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    if (alpha < 128) continue;
    if (r < 25 && g < 25 && b < 25) continue;
    if (r > 235 && g > 235 && b > 235) continue;
    const [h, s, l] = rgbToHsl(r, g, b);

    if (s < 0.08) continue;

    if (l < 0.12) continue;
    const rBucket = Math.floor(r / 32) * 32;
    const gBucket = Math.floor(g / 32) * 32;
    const bBucket = Math.floor(b / 32) * 32;

    const colorKey = `${rBucket},${gBucket},${bBucket}`;

    const weight = s * 0.6 + Math.min(l * 1.8, 1) * 0.4;
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + weight;
  }
    
  let dominantColor = "255,223,100";
  let maxScore = 0;

  for (const [color, score] of Object.entries(colorCounts)) {
    const [r, g, b] = color.split(",").map(Number);
    const [h, s, l] = rgbToHsl(r, g, b);
    const saturationBonus = s > 0.25 ? 1.8 : 1;
    const lightnessBonus = l > 0.35 ? 1.6 : l > 0.25 ? 1.3 : 1;
    const finalScore = score * saturationBonus * lightnessBonus;

    if (finalScore > maxScore) {
      maxScore = finalScore;
      dominantColor = color;
    }
  }

  return dominantColor.split(",").map(Number);
}

// Function to create color variations
function createColorScheme(dominantRGB) {
  const [r, g, b] = dominantRGB;

  // Create variations
  const primary = `rgb(${r}, ${g}, ${b})`;
  const primaryLight = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
  const primaryDark = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
  const primaryAlpha = `rgba(${r}, ${g}, ${b}, 0.8)`;
  const primaryLightAlpha = `rgba(${r}, ${g}, ${b}, 0.08)`;
  const primaryGlow = `rgba(${r}, ${g}, ${b}, 0.66)`;

  return {
    primary,
    primaryLight,
    primaryDark,
    primaryAlpha,
    primaryLightAlpha,
    primaryGlow,
    rgb: [r, g, b],
  };
}

module.exports = async function card1({
  title,
  author,
  thumbnail,
  startTime,
  endTime,
  requester,
  progressPercent = 0,
  source,
}) {
  const width = 660;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Default color scheme (gold fallback)
  let colorScheme = {
    primary: "rgb(0, 255, 255)",
    primaryLight: "rgb(40, 255, 255)",
    primaryDark: "rgb(0, 195, 195)",
    primaryAlpha: "rgba(0, 255, 255, 0.8)",
    primaryLightAlpha: "rgba(0, 255, 255, 0.2)",
    primaryGlow: "rgba(0, 255, 255, 0.6)",
    rgb: [0, 255, 255],
  };

  // Load thumbnail and extract colors
  let thumbnailImage = null;
  let sourceIconImage = null;
  let userIconImage = null;
  try {
    thumbnailImage = await loadImage(thumbnail);

    // Create a small canvas to extract color data
    const colorCanvas = createCanvas(100, 100);
    const colorCtx = colorCanvas.getContext("2d");
    colorCtx.drawImage(thumbnailImage, 0, 0, 100, 100);
    const imageData = colorCtx.getImageData(0, 0, 100, 100);

    // Extract dominant color and create scheme
    const dominantColor = extractDominantColor(imageData);
    colorScheme = createColorScheme(dominantColor);
  } catch (error) {
    console.log(`Preset1`);
  }

  // Background with deep blurred particles
  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 5 + 2;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, ${Math.random() * 0.08})`;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const userIconPath = path.resolve(__dirname, `../img/user.png`);
  try {
    userIconImage = await loadImage(userIconPath);
  } catch (error) {
    console.log("User icon loading error:", error);
  }

  if (source) {
    const sourceIconPath = path.resolve(__dirname, `../img/${source}.png`);
    try {
      sourceIconImage = await loadImage(sourceIconPath);
    } catch (error) {
      console.log("Source icon loading error:", error);
    }
  }

  // Thumbnail setup
  if (thumbnailImage) {
    const thumbSize = 120;
    const thumbX = 25;
    const thumbY = (height - thumbSize) / 2;

    // Soft shadow
    ctx.save();
    ctx.shadowColor = "#00000099";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.roundRect(thumbX - 4, thumbY - 4, thumbSize + 8, thumbSize + 8, 20);
    ctx.fillStyle = "#00000030";
    ctx.fill();
    ctx.restore();

    // Glow layer with theme color
    ctx.save();
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 18);
    ctx.clip();
    ctx.drawImage(thumbnailImage, thumbX, thumbY, thumbSize, thumbSize);
    ctx.restore();

    // Border with theme color
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = colorScheme.primary;
    ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 18);
    ctx.stroke();
  }

  // Add source icon in top right corner with full theme color adoption
  if (sourceIconImage) {
    const iconSize = 40;
    const iconX = width - iconSize - 20;
    const iconY = 20;

    ctx.save();

    // Background circle with theme tint
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2 + 6,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.25)`;
    ctx.fill();

    // Glow + crisp original icon
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sourceIconImage, iconX, iconY, iconSize, iconSize);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.drawImage(sourceIconImage, iconX, iconY, iconSize, iconSize);

    ctx.restore();
  }

  const textX = 165;

  // Title with themed gradient and glow
  const titleGradient = ctx.createLinearGradient(textX, 0, textX + 280, 0);
  titleGradient.addColorStop(0, colorScheme.primaryLight);
  titleGradient.addColorStop(0.5, colorScheme.primary);
  titleGradient.addColorStop(1, colorScheme.primaryDark);
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 9;
  ctx.fillStyle = titleGradient;
  ctx.font = "bold 22px sans-serif";
  const clippedTitle = title.length > 45 ? title.slice(0, 42) + "..." : title;
  ctx.fillText(clippedTitle, textX, 50);

  // Author and Requester
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#eeeeee";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Author: ${author}`, textX, 80);
  ctx.fillText(`Requested by: ${requester}`, textX, 105);

  // Time
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#999999";
  ctx.fillText(startTime, textX, height - 15);
  ctx.fillText(endTime, width - 60, height - 15);

  // Advanced Glass Progress Bar with theme colors
  const barX = textX;
  const barY = height - 40;
  const barWidth = width - barX - 20;
  const barHeight = 10;

  const radius = 6;

  // Bar background with subtle theme tint
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(barX + radius, barY);
  ctx.lineTo(barX + barWidth - radius, barY);
  ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + radius, radius);
  ctx.lineTo(barX + barWidth, barY + barHeight - radius);
  ctx.arcTo(
    barX + barWidth,
    barY + barHeight,
    barX + barWidth - radius,
    barY + barHeight,
    radius
  );
  ctx.lineTo(barX + radius, barY + barHeight);
  ctx.arcTo(barX, barY + barHeight, barX, barY + barHeight - radius, radius);
  ctx.lineTo(barX, barY + radius);
  ctx.arcTo(barX, barY, barX + radius, barY, radius);
  ctx.closePath();

  const glassGradient = ctx.createLinearGradient(
    barX,
    barY,
    barX,
    barY + barHeight
  );
  glassGradient.addColorStop(
    0,
    `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.1)`
  );
  glassGradient.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = glassGradient;
  ctx.fill();
  ctx.restore();

  // Progress fill with theme color
  const progressWidth = (progressPercent / 100) * barWidth;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(barX + radius, barY);
  ctx.lineTo(barX + progressWidth - radius, barY);
  ctx.arcTo(
    barX + progressWidth,
    barY,
    barX + progressWidth,
    barY + radius,
    radius
  );
  ctx.lineTo(barX + progressWidth, barY + barHeight - radius);
  ctx.arcTo(
    barX + progressWidth,
    barY + barHeight,
    barX + progressWidth - radius,
    barY + barHeight,
    radius
  );
  ctx.lineTo(barX + radius, barY + barHeight);
  ctx.arcTo(barX, barY + barHeight, barX, barY + barHeight - radius, radius);
  ctx.lineTo(barX, barY + radius);
  ctx.arcTo(barX, barY, barX + radius, barY, radius);
  ctx.closePath();

  const progGradient = ctx.createLinearGradient(
    barX,
    0,
    barX + progressWidth,
    0
  );
  progGradient.addColorStop(0, colorScheme.primaryLight);
  progGradient.addColorStop(1, colorScheme.primary);
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 6;
  ctx.fillStyle = progGradient;
  ctx.fill();
  ctx.restore();

  return canvas.toBuffer("image/png");
};