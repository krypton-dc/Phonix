const { createCanvas, loadImage } = require("@napi-rs/canvas");

// Function to extract dominant color from thumbnail
function extractDominantColor(imageData) {
  const data = imageData.data;
  const colorCounts = {};

  // Sample pixels (every 4th pixel for performance)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];

    // Skip transparent pixels and very dark/light pixels
    if (
      alpha < 128 ||
      (r < 30 && g < 30 && b < 30) ||
      (r > 225 && g > 225 && b > 225)
    ) {
      continue;
    }

    // Group similar colors (reduce precision)
    const rBucket = Math.floor(r / 32) * 32;
    const gBucket = Math.floor(g / 32) * 32;
    const bBucket = Math.floor(b / 32) * 32;

    const colorKey = `${rBucket},${gBucket},${bBucket}`;
    colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
  }

  // Find most frequent color
  let dominantColor = "0,255,255"; // fallback cyan
  let maxCount = 0;

  for (const [color, count] of Object.entries(colorCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return dominantColor.split(",").map(Number);
}

// Function to create color variations
function createColorScheme(dominantRGB) {
  const [r, g, b] = dominantRGB;

  // Create complementary color for gradient effect
  const compR = Math.min(255, Math.max(0, 255 - r + Math.random() * 100 - 50));
  const compG = Math.min(255, Math.max(0, 255 - g + Math.random() * 100 - 50));
  const compB = Math.min(255, Math.max(0, 255 - b + Math.random() * 100 - 50));

  const primary = `rgb(${r}, ${g}, ${b})`;
  const secondary = `rgb(${compR}, ${compG}, ${compB})`;
  const primaryLight = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
  const primaryAlpha = `rgba(${r}, ${g}, ${b}, 0.7)`;
  const primaryLightAlpha = `rgba(${r}, ${g}, ${b}, 0.06)`;

  return {
    primary,
    secondary,
    primaryLight,
    primaryAlpha,
    primaryLightAlpha,
    rgb: [r, g, b],
    secondaryRgb: [compR, compG, compB],
  };
}

module.exports = async function card3({
  title,
  author,
  thumbnail,
  startTime,
  endTime,
  requester,
  progressPercent = 0,
}) {
  const width = 1000;
  const height = 380;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Default color scheme (cyan-magenta fallback)
  let colorScheme = {
    primary: "rgb(0, 255, 255)",
    secondary: "rgb(255, 0, 255)",
    primaryLight: "rgb(40, 255, 255)",
    primaryAlpha: "rgba(0, 255, 255, 0.7)",
    primaryLightAlpha: "rgba(0, 255, 255, 0.06)",
    rgb: [0, 255, 255],
    secondaryRgb: [255, 0, 255],
  };

  // Load thumbnail and extract colors
  let thumbnailImage = null;
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
    console.log(`Preset3`);
  }

  ctx.fillStyle = "#0c0c0f";
  ctx.fillRect(0, 0, width, height);

  // Background Particles with theme colors
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.8 + 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    // Alternate between primary and secondary colors
    const useSecondary = Math.random() > 0.5;
    const [red, green, blue] = useSecondary
      ? colorScheme.secondaryRgb
      : colorScheme.rgb;
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.06)`;
    ctx.fill();
  }

  // Glass Panel with subtle theme tint
  const cardX = 40;
  const cardY = 40;
  const cardWidth = width - 80;
  const cardHeight = height - 80;

  ctx.fillStyle = `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.07)`;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 30);
  ctx.fill();

  // Circular Thumbnail with theme glow
  const thumbSize = 160;
  const thumbX = cardX + 40;
  const thumbY = cardY + 60;
  if (thumbnailImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      thumbX + thumbSize / 2,
      thumbY + thumbSize / 2,
      thumbSize / 2,
      0,
      Math.PI * 2
    );
    ctx.shadowColor = colorScheme.primaryAlpha;
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.clip();
    ctx.drawImage(thumbnailImage, thumbX, thumbY, thumbSize, thumbSize);
    ctx.restore();
  }

  // Text Block with theme gradient
  const textX = thumbX + thumbSize + 50;
  const textY = cardY + 65;
  const clippedTitle = title.length > 45 ? title.slice(0, 42) + "..." : title;

  const grad = ctx.createLinearGradient(textX, textY, textX + 400, textY);
  grad.addColorStop(0, colorScheme.primary);
  grad.addColorStop(1, colorScheme.secondary);

  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = grad;
  ctx.fillText(clippedTitle, textX, textY + 20);

  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#dddddd";
  ctx.fillText(`Author: ${author}`, textX, textY + 60);
  ctx.fillText(`Requester: ${requester}`, textX, textY + 95);

  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#aaa";
  ctx.fillText(startTime, textX, cardY + cardHeight - 30);
  ctx.fillText(endTime, cardX + cardWidth - 90, cardY + cardHeight - 30);

  // Waveform Progress Bar with theme colors
  const barCount = 48;
  const barWidth = 6;
  const spacing = 6;
  const totalWidth = barCount * (barWidth + spacing);
  const waveX = textX;
  const waveY = cardY + cardHeight - 65;
  const maxHeight = 36;
  const filledBars = Math.floor((barCount * progressPercent) / 100);

  for (let i = 0; i < barCount; i++) {
    const x = waveX + i * (barWidth + spacing);
    const variation = Math.abs(Math.sin(i * 0.3)) * 20 + 10;
    const y = waveY - variation;

    const gradient = ctx.createLinearGradient(x, y, x, y + variation);
    gradient.addColorStop(0, colorScheme.primary);
    gradient.addColorStop(1, colorScheme.secondary);

    ctx.fillStyle =
      i < filledBars
        ? gradient
        : `rgba(${colorScheme.rgb[0]}, ${colorScheme.rgb[1]}, ${colorScheme.rgb[2]}, 0.07)`;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, variation, 3);
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
};
