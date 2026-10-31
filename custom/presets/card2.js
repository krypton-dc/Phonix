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

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];

    // Skip transparent pixels
    if (alpha < 128) continue;

    // Skip very dark colors (but allow medium tones)
    if (r < 20 && g < 20 && b < 20) continue;

    // Skip very light colors (near white)
    if (r > 240 && g > 240 && b > 240) continue;

    // Get HSL values
    const [h, s, l] = rgbToHsl(r, g, b);

    // Skip very low saturation colors (greys) but be less strict
    if (s < 0.1) continue;

    // Skip very dark colors in HSL space
    if (l < 0.15) continue;

    // Bucket colors by rounding to nearest bucket center
    const bucketSize = 32;
    const rBucket = Math.min(255, Math.round(r / bucketSize) * bucketSize);
    const gBucket = Math.min(255, Math.round(g / bucketSize) * bucketSize);
    const bBucket = Math.min(255, Math.round(b / bucketSize) * bucketSize);

    const colorKey = `${rBucket},${gBucket},${bBucket}`;

    // Weight the count based on saturation and lightness to prefer vibrant colors
    const weight = s * 0.7 + Math.min(l * 1.5, 1) * 0.3;
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + weight;
  }

  let dominantColor = "0,255,255"; // fallback cyan
  let maxScore = 0;

  for (const [color, score] of Object.entries(colorCounts)) {
    const [r, g, b] = color.split(",").map(Number);
    const [h, s, l] = rgbToHsl(r, g, b);

    // Bonus for colors that are more saturated and lighter
    const bonus = (s > 0.3 ? 1.5 : 1) * (l > 0.4 ? 1.3 : 1);
    const finalScore = score * bonus;

    if (finalScore > maxScore) {
      maxScore = finalScore;
      dominantColor = color;
    }
  }

  return dominantColor.split(",").map(Number);
}

function createColorScheme(dominantRGB) {
  const [r, g, b] = dominantRGB;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const diff = max - min;
  const sum = max + min;

  let h, s;
  const l = sum / 2;
  if (diff === 0) {
    h = 0;
    s = 0;
  } else if (max === r / 255) {
    h = ((g / 255 - b / 255) / diff) % 6;
  } else if (max === g / 255) {
    h = (b / 255 - r / 255) / diff + 2;
  } else {
    h = (r / 255 - g / 255) / diff + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  if (diff !== 0) {
    s = diff / (1 - Math.abs(2 * (sum / 2) - 1));
  }
  const primary = `rgb(${r}, ${g}, ${b})`;
  const primaryLight = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
  const primaryDark = `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;
  const primaryAlpha = `rgba(${r}, ${g}, ${b}, 0.8)`;
  const primaryLightAlpha = `rgba(${r}, ${g}, ${b}, 0.2)`;
  const primaryGlow = `rgba(${r}, ${g}, ${b}, 0.6)`;

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

function drawThemedIcon(ctx, img, x, y, size, colorScheme) {
  ctx.save();

  // Draw icon
  ctx.shadowBlur = 0;
  ctx.drawImage(img, x, y, size, size);

  // Tint the icon using multiply
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = colorScheme.primary;
  ctx.globalAlpha = 0.5; // adjust for desired tint strength
  ctx.fillRect(x, y, size, size);

  ctx.globalAlpha = 0.05; // adjust for desired glow strength
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

module.exports = async function card2({
  title,
  author,
  thumbnail,
  startTime,
  endTime,
  requester,
  progressPercent = 0,
  source, // New parameter for source icon
}) {
  const width = 920;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let colorScheme = {
    primary: "rgb(0, 255, 255)",
    primaryLight: "rgb(40, 255, 255)",
    primaryDark: "rgb(0, 195, 195)",
    primaryAlpha: "rgba(0, 255, 255, 0.8)",
    primaryLightAlpha: "rgba(0, 255, 255, 0.2)",
    primaryGlow: "rgba(0, 255, 255, 0.6)",
    rgb: [0, 255, 255],
  };
  let thumbnailImage = null;
  let sourceIconImage = null;
  let authorIconImage = null;
  let requesterIconImage = null;

  try {
    thumbnailImage = await loadImage(thumbnail);
    const colorCanvas = createCanvas(100, 100);
    const colorCtx = colorCanvas.getContext("2d");
    colorCtx.drawImage(thumbnailImage, 0, 0, 100, 100);
    const imageData = colorCtx.getImageData(0, 0, 100, 100);
    const dominantColor = extractDominantColor(imageData);
    colorScheme = createColorScheme(dominantColor);
  } catch (error) {
      console.log(`Preset2`)
  }

  const authorIconPath = path.resolve(__dirname, `../img/author.png`);
  try {
    authorIconImage = await loadImage(authorIconPath);
  } catch (error) {
    console.log("Author icon loading error:", error);
  }
  const requesterIconPath = path.resolve(__dirname, `../img/user.png`);
  try {
    requesterIconImage = await loadImage(requesterIconPath);
  } catch (error) {
    console.log("Requester icon loading error:", error);
  }

  if (source) {
    const sourceIconPath = path.resolve(__dirname, `../img/${source}.png`);
    try {
      sourceIconImage = await loadImage(sourceIconPath);
    } catch (error) {
      console.log("Source icon loading error:", error);
    }
  }

  // Drawing code remains same as you provided
  ctx.fillStyle = "#05080a";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, ${Math.random() * 0.2 + 0.05})`;
    ctx.fill();
  }

  const cardX = 40;
  const cardY = 30;
  const cardWidth = width - 80;
  const cardHeight = height - 60;
  ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.08)`;
  ctx.beginPath();
  ctx.moveTo(cardX + 25, cardY);
  ctx.lineTo(cardX + cardWidth - 25, cardY);
  ctx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + 25);
  ctx.lineTo(cardX + cardWidth, cardY + cardHeight - 25);
  ctx.quadraticCurveTo(
    cardX + cardWidth,
    cardY + cardHeight,
    cardX + cardWidth - 25,
    cardY + cardHeight
  );
  ctx.lineTo(cardX + 25, cardY + cardHeight);
  ctx.quadraticCurveTo(
    cardX,
    cardY + cardHeight,
    cardX,
    cardY + cardHeight - 25
  );
  ctx.lineTo(cardX, cardY + 25);
  ctx.quadraticCurveTo(cardX, cardY, cardX + 25, cardY);
  ctx.closePath();
  ctx.fill();

  const thumbWidth = 190;
  const thumbHeight = 190;
  const thumbX = cardX + 50;
  const thumbY = cardY + 30;

  if (thumbnailImage) {
    ctx.save();
    ctx.beginPath();
    const radius = 32;

    ctx.moveTo(thumbX + radius, thumbY);
    ctx.lineTo(thumbX + thumbWidth - radius, thumbY);
    ctx.quadraticCurveTo(
      thumbX + thumbWidth,
      thumbY,
      thumbX + thumbWidth,
      thumbY + radius
    );
    ctx.lineTo(thumbX + thumbWidth, thumbY + thumbHeight - radius);
    ctx.quadraticCurveTo(
      thumbX + thumbWidth,
      thumbY + thumbHeight,
      thumbX + thumbWidth - radius,
      thumbY + thumbHeight
    );
    ctx.lineTo(thumbX + radius, thumbY + thumbHeight);
    ctx.quadraticCurveTo(
      thumbX,
      thumbY + thumbHeight,
      thumbX,
      thumbY + thumbHeight - radius
    );
    ctx.lineTo(thumbX, thumbY + radius);
    ctx.quadraticCurveTo(thumbX, thumbY, thumbX + radius, thumbY);

    ctx.closePath();
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 20;
    ctx.clip();
    ctx.drawImage(thumbnailImage, thumbX, thumbY, thumbWidth, thumbHeight);
    ctx.restore();
  }

  // Add source icon in top right corner
  if (sourceIconImage) {
    const iconSize = 40;
    const iconX = cardX + cardWidth - iconSize - 20; // 20px padding from right edge
    const iconY = cardY + 20; // 20px padding from top edge

    ctx.save();
    // Add glow effect matching the theme
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.9;

    // Create a subtle background circle for the icon
    ctx.beginPath();
    ctx.arc(
      iconX + iconSize / 2,
      iconY + iconSize / 2,
      iconSize / 2 + 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.15)`;
    ctx.fill();

    // Draw the source icon
    ctx.shadowBlur = 8;
    ctx.drawImage(sourceIconImage, iconX, iconY, iconSize, iconSize);
    ctx.restore();
  }
  // Text start X
  const textX = cardX + 280;

  // === Title ===
  const clippedTitle = title.length > 55 ? title.slice(0, 52) + "..." : title;
  const titleGradient = ctx.createLinearGradient(
    textX,
    cardY + 60,
    textX + 400,
    cardY + 60
  );
  titleGradient.addColorStop(0, colorScheme.primary);
  titleGradient.addColorStop(1, colorScheme.primaryLight);

  ctx.fillStyle = titleGradient;
  ctx.font = "bold 34px Poppins";
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 10;
  ctx.fillText(clippedTitle, textX, cardY + 70);

  // reset glow
  ctx.shadowBlur = 0;

  // === Common row style ===
  const rowIconSize = 35; // slightly smaller for neatness
  const rowGap = 10; // more breathing room
  ctx.font = "17px Poppins";
  ctx.fillStyle = "#ccc";

  // === Author row ===
  let rowY = cardY + 110;
  if (authorIconImage) {
    drawThemedIcon(
      ctx,
      authorIconImage,
      textX,
      rowY - rowIconSize + 10,
      rowIconSize,
      colorScheme
    );
  }
  // Gradient for author text
  const authorGradient = ctx.createLinearGradient(
    textX + rowIconSize + rowGap,
    rowY,
    textX + rowIconSize + rowGap + 200,
    rowY
  );
  authorGradient.addColorStop(0, colorScheme.primary);
  authorGradient.addColorStop(1, colorScheme.primaryLight);

  ctx.save();
  ctx.fillStyle = authorGradient;
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 8;
  ctx.font = "17px Poppins";
  ctx.fillText(`Author: ${author}`, textX + rowIconSize + rowGap, rowY);
  ctx.restore();

  // === Requester row ===
  rowY += 28;
  if (requesterIconImage) {
    drawThemedIcon(
      ctx,
      requesterIconImage,
      textX,
      rowY - rowIconSize + 10,
      rowIconSize,
      colorScheme
    );
  }
  // Gradient for requester text
  const requesterGradient = ctx.createLinearGradient(
    textX + rowIconSize + rowGap,
    rowY,
    textX + rowIconSize + rowGap + 200,
    rowY
  );
  requesterGradient.addColorStop(0, colorScheme.primary);
  requesterGradient.addColorStop(1, colorScheme.primaryLight);

  ctx.save();
  ctx.fillStyle = requesterGradient;
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 8;
  ctx.font = "17px Poppins";
  ctx.fillText(
    `Requested by: ${requester}`,
    textX + rowIconSize + rowGap,
    rowY
  );
  ctx.restore();

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(startTime, textX, cardY + cardHeight - 20);
  ctx.fillText(endTime, cardX + cardWidth - 100, cardY + cardHeight - 20);

  const barX = textX;
  const barY = cardY + cardHeight - 50;
  const barWidth = cardWidth - 320;
  const barHeight = 12;

  ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.15)`;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 6);
  ctx.fill();

  const progressWidth = (progressPercent / 100) * barWidth;
  ctx.fillStyle = colorScheme.primary;
  ctx.shadowColor = colorScheme.primary;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(barX, barY, progressWidth, barHeight, 6);
  ctx.fill();

  return canvas.toBuffer("image/png");
};
