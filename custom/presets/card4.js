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

    if (alpha < 128) continue;
    if (r < 20 && g < 20 && b < 20) continue;
    if (r > 240 && g > 240 && b > 240) continue;

    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.1) continue;
    if (l < 0.15) continue;

    const bucketSize = 32;
    const rBucket = Math.min(255, Math.round(r / bucketSize) * bucketSize);
    const gBucket = Math.min(255, Math.round(g / bucketSize) * bucketSize);
    const bBucket = Math.min(255, Math.round(b / bucketSize) * bucketSize);

    const colorKey = `${rBucket},${gBucket},${bBucket}`;
    const weight = s * 0.7 + Math.min(l * 1.5, 1) * 0.3;
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + weight;
  }

  let dominantColor = "120,255,180"; // Phonix signature mint-cyan fallback
  let maxScore = 0;

  for (const [color, score] of Object.entries(colorCounts)) {
    const [r, g, b] = color.split(",").map(Number);
    const [h, s, l] = rgbToHsl(r, g, b);

    const bonus = (s > 0.3 ? 1.5 : 1) * (l > 0.4 ? 1.3 : 1);
    const finalScore = score * bonus;

    if (finalScore > maxScore) {
      maxScore = finalScore;
      dominantColor = color;
    }
  }

  return dominantColor.split(",").map(Number);
}

function createPhonixColorScheme(dominantRGB) {
  const [r, g, b] = dominantRGB;

  // Phonix signature color enhancement
  // Boost cyan/teal tones and add a slight purple accent
  const enhancedR = Math.min(255, Math.max(0, r * 0.8 + 30));
  const enhancedG = Math.min(255, Math.max(0, g * 1.1 + 20));
  const enhancedB = Math.min(255, Math.max(0, b * 1.2 + 40));

  const primary = `rgb(${Math.round(enhancedR)}, ${Math.round(enhancedG)}, ${Math.round(enhancedB)})`;
  const primaryLight = `rgb(${Math.min(255, Math.round(enhancedR + 60))}, ${Math.min(255, Math.round(enhancedG + 40))}, ${Math.min(255, Math.round(enhancedB + 20))})`;
  const primaryDark = `rgb(${Math.max(0, Math.round(enhancedR - 80))}, ${Math.max(0, Math.round(enhancedG - 40))}, ${Math.max(0, Math.round(enhancedB - 20))})`;
  const primaryAlpha = `rgba(${Math.round(enhancedR)}, ${Math.round(enhancedG)}, ${Math.round(enhancedB)}, 0.8)`;
  const primaryLightAlpha = `rgba(${Math.round(enhancedR)}, ${Math.round(enhancedG)}, ${Math.round(enhancedB)}, 0.25)`;
  const primaryGlow = `rgba(${Math.round(enhancedR)}, ${Math.round(enhancedG)}, ${Math.round(enhancedB)}, 0.7)`;

  // Phonix accent colors
  const accent = `rgb(180, 120, 255)`; // Purple accent
  const accentGlow = `rgba(180, 120, 255, 0.6)`;

  return {
    primary,
    primaryLight,
    primaryDark,
    primaryAlpha,
    primaryLightAlpha,
    primaryGlow,
    accent,
    accentGlow,
    rgb: [Math.round(enhancedR), Math.round(enhancedG), Math.round(enhancedB)],
  };
}

function drawPhonixThemedIcon(ctx, img, x, y, size, colorScheme) {
  ctx.save();

  // Enhanced glow for Phonix style
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 15;
  ctx.drawImage(img, x, y, size, size);

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = colorScheme.primary;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x, y, size, size);

  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function drawPhonixStars(ctx, width, height, colorScheme) {
  // More dynamic star field for Phonix
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 2 + 0.3;
    const twinkle = Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    // Mix of primary color and accent purple
    if (Math.random() > 0.7) {
      ctx.fillStyle = `rgba(180, 120, 255, ${(Math.random() * 0.3 + 0.1) * twinkle})`;
    } else {
      ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, ${(Math.random() * 0.25 + 0.05) * twinkle})`;
    }
    ctx.fill();
  }
}

module.exports = async function PhonixCard({
  title,
  author,
  thumbnail,
  startTime,
  endTime,
  requester,
  progressPercent = 0,
  source,
}) {
  const width = 920;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  let colorScheme = {
    primary: "rgb(120, 255, 180)",
    primaryLight: "rgb(180, 255, 200)",
    primaryDark: "rgb(40, 195, 140)",
    primaryAlpha: "rgba(120, 255, 180, 0.8)",
    primaryLightAlpha: "rgba(120, 255, 180, 0.25)",
    primaryGlow: "rgba(120, 255, 180, 0.7)",
    accent: "rgb(180, 120, 255)",
    accentGlow: "rgba(180, 120, 255, 0.6)",
    rgb: [120, 255, 180],
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
    colorScheme = createPhonixColorScheme(dominantColor);
  } catch (error) {
    console.log(`Phonix Preset - Image loading error:`, error);
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

  // Phonix signature dark gradient background
  const bgGradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
  );
  bgGradient.addColorStop(0, "#0a0515");
  bgGradient.addColorStop(0.6, "#051020");
  bgGradient.addColorStop(1, "#020508");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Dynamic star field
  drawPhonixStars(ctx, width, height, colorScheme);

  const cardX = 40;
  const cardY = 30;
  const cardWidth = width - 80;
  const cardHeight = height - 60;

  // Phonix card with enhanced glow and double border
  ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.12)`;
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 25;

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

  // Inner accent border
  ctx.strokeStyle = `rgba(180, 120, 255, 0.3)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;

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
    ctx.shadowBlur = 30;
    ctx.clip();
    ctx.drawImage(thumbnailImage, thumbX, thumbY, thumbWidth, thumbHeight);
    ctx.restore();

    // Add thumbnail border glow
    ctx.save();
    ctx.strokeStyle = colorScheme.primary;
    ctx.lineWidth = 3;
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
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
    ctx.stroke();
    ctx.restore();
  }

  // Enhanced source icon with Phonix styling
  if (sourceIconImage) {
    const iconSize = 40;
    const iconX = cardX + cardWidth - iconSize - 20;
    const iconY = cardY + 20;

    ctx.save();
    ctx.shadowColor = colorScheme.accentGlow;
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.9;

    // Phonix signature hexagonal background
    const centerX = iconX + iconSize / 2;
    const centerY = iconY + iconSize / 2;
    const hexRadius = iconSize / 2 + 6;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + hexRadius * Math.cos(angle);
      const y = centerY + hexRadius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const iconGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      hexRadius
    );
    iconGradient.addColorStop(0, `rgba(180, 120, 255, 0.25)`);
    iconGradient.addColorStop(
      1,
      `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.15)`
    );
    ctx.fillStyle = iconGradient;
    ctx.fill();

    ctx.shadowBlur = 12;
    ctx.drawImage(sourceIconImage, iconX, iconY, iconSize, iconSize);
    ctx.restore();
  }

  const textX = cardX + 280;

  // Phonix signature title with enhanced gradient
  const clippedTitle = title.length > 50 ? title.slice(0, 47) + "..." : title;
  const titleGradient = ctx.createLinearGradient(
    textX,
    cardY + 60,
    textX + 500,
    cardY + 60
  );
  titleGradient.addColorStop(0, colorScheme.primary);
  titleGradient.addColorStop(0.6, colorScheme.primaryLight);
  titleGradient.addColorStop(1, colorScheme.accent);

  ctx.fillStyle = titleGradient;
  ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 15;
  ctx.fillText(clippedTitle, textX, cardY + 70);

  // Add "Phonix" watermark
  ctx.save();
  ctx.font = "italic 12px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = `rgba(180, 120, 255, 0.4)`;
  ctx.fillText("Phonix", cardX + cardWidth - 60, cardY + cardHeight - 8);
  ctx.restore();

  ctx.shadowBlur = 0;

  const rowIconSize = 35;
  const rowGap = 12;
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";

  // Author row with enhanced styling
  let rowY = cardY + 115;
  if (authorIconImage) {
    drawPhonixThemedIcon(
      ctx,
      authorIconImage,
      textX,
      rowY - rowIconSize + 10,
      rowIconSize,
      colorScheme
    );
  }

  const authorGradient = ctx.createLinearGradient(
    textX + rowIconSize + rowGap,
    rowY,
    textX + rowIconSize + rowGap + 300,
    rowY
  );
  authorGradient.addColorStop(0, colorScheme.primary);
  authorGradient.addColorStop(1, colorScheme.primaryLight);

  ctx.save();
  ctx.fillStyle = authorGradient;
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 10;
  ctx.fillText(`♪ ${author}`, textX + rowIconSize + rowGap, rowY);
  ctx.restore();

  // Requester row
  rowY += 32;
  if (requesterIconImage) {
    drawPhonixThemedIcon(
      ctx,
      requesterIconImage,
      textX,
      rowY - rowIconSize + 10,
      rowIconSize,
      colorScheme
    );
  }

  const requesterGradient = ctx.createLinearGradient(
    textX + rowIconSize + rowGap,
    rowY,
    textX + rowIconSize + rowGap + 300,
    rowY
  );
  requesterGradient.addColorStop(0, colorScheme.primary);
  requesterGradient.addColorStop(1, colorScheme.accent);

  ctx.save();
  ctx.fillStyle = requesterGradient;
  ctx.shadowColor = colorScheme.accentGlow;
  ctx.shadowBlur = 10;
  ctx.fillText(`◆ ${requester}`, textX + rowIconSize + rowGap, rowY);
  ctx.restore();

  // Time display with Phonix styling
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = colorScheme.primaryLight;
  ctx.shadowColor = colorScheme.primaryGlow;
  ctx.shadowBlur = 8;
  ctx.fillText(startTime, textX, cardY + cardHeight - 20);
  ctx.fillText(endTime, cardX + cardWidth - 100, cardY + cardHeight - 20);
  ctx.shadowBlur = 0;

  // Enhanced progress bar with dual-color design
  const barX = textX;
  const barY = cardY + cardHeight - 50;
  const barWidth = cardWidth - 320;
  const barHeight = 14;

  // Background bar with gradient
  const bgBarGradient = ctx.createLinearGradient(
    barX,
    barY,
    barX + barWidth,
    barY
  );
  bgBarGradient.addColorStop(
    0,
    `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.2)`
  );
  bgBarGradient.addColorStop(1, `rgba(180, 120, 255, 0.15)`);
  ctx.fillStyle = bgBarGradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 7);
  ctx.fill();

  // Progress fill with enhanced gradient
  const progressWidth = (progressPercent / 100) * barWidth;
  if (progressWidth > 0) {
    const progressGradient = ctx.createLinearGradient(
      barX,
      barY,
      barX + progressWidth,
      barY
    );
    progressGradient.addColorStop(0, colorScheme.primary);
    progressGradient.addColorStop(0.5, colorScheme.primaryLight);
    progressGradient.addColorStop(1, colorScheme.accent);

    ctx.fillStyle = progressGradient;
    ctx.shadowColor = colorScheme.primaryGlow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(barX, barY, progressWidth, barHeight, 7);
    ctx.fill();

    // Add progress indicator dot
    ctx.beginPath();
    ctx.arc(barX + progressWidth, barY + barHeight / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = colorScheme.accent;
    ctx.shadowBlur = 20;
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
};
