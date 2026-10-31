const { createCanvas, loadImage } = require("canvas");

async function generatePfp(baseImageBuffer, text, selectedFont) {
  const img = await loadImage(baseImageBuffer);
  const canvasSize = 512;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext("2d");
  const size = Math.min(img.width, img.height);
  const offsetX = (img.width - size) / 2;
  const offsetY = (img.height - size) / 2;
  ctx.drawImage(
    img,
    offsetX,
    offsetY,
    size,
    size,
    0,
    0,
    canvasSize,
    canvasSize
  );

  // Overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // Adaptive font size
  let fontSize = 100;
  do {
    ctx.font = `${fontSize}px "${selectedFont}"`;
    fontSize -= 5;
  } while (ctx.measureText(text).width > canvasSize - 60 && fontSize > 30);

  // Text
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
  ctx.shadowBlur = 15;
  ctx.fillText(text, canvasSize / 2, canvasSize - 135);

  // Watermark
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.shadowBlur = 0;
  ctx.fillText("Phonix", 60, 60);

  return canvas.toBuffer("image/png");
}

module.exports = { generatePfp };
