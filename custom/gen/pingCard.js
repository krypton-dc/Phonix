const { createCanvas } = require("canvas");

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

function drawSingleGraph(
  ctx,
  history,
  title,
  color,
  x,
  y,
  width,
  height,
  maxHistory
) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  roundRect(ctx, x, y, width, height, 10);
  ctx.fill();
  ctx.font = "bold 20px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(title, x + width / 2, y + 30);

  const graphOriginX = x + 40;
  const graphOriginY = y + height - 40;
  const graphWidth = width - 60;
  const graphHeight = height - 80;

  const yMax = Math.max(100, ...history.map((p) => p + 20));
  ctx.strokeStyle = "#4a5568";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(graphOriginX, graphOriginY - graphHeight);
  ctx.lineTo(graphOriginX, graphOriginY);
  ctx.lineTo(graphOriginX + graphWidth, graphOriginY);
  ctx.stroke();
  ctx.fillStyle = "#a0aec0";
  ctx.font = "12px 'Helvetica Neue', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(Math.round(yMax), graphOriginX - 8, y + 50);
  ctx.fillText("0", graphOriginX - 8, graphOriginY + 4);
  const barWidth = graphWidth / (maxHistory + 1);
  history.forEach((ping, i) => {
    const barHeight = Math.max(1, (ping / yMax) * graphHeight);
    const barX = graphOriginX + i * barWidth + barWidth / 2;
    const barY = graphOriginY - barHeight;

    const barGradient = ctx.createLinearGradient(
      barX,
      barY,
      barX,
      barY + barHeight
    );
    barGradient.addColorStop(0, color);
    barGradient.addColorStop(1, "rgba(44, 62, 80, 0.5)");

    ctx.fillStyle = barGradient;
    roundRect(ctx, barX, barY, barWidth, barHeight, 3);
    ctx.fill();
  });

  ctx.restore();
}

function createLatencyCanvas(
  apiHistory,
  msgHistory,
  wsLatency,
  msgLatency,
  maxHistory
) {
  const width = 850;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#2c3e50");
  background.addColorStop(1, "#1c2833");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.font = "bold 28px 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Real-time Latency Report", width / 2, 50);
  const graphWidth = 380;
  const graphHeight = 320;
  const graphY = 100;

  drawSingleGraph(
    ctx,
    apiHistory,
    `API Latency (${wsLatency}ms)`,
    "#1abc9c",
    30,
    graphY,
    graphWidth,
    graphHeight,
    maxHistory
  );
  drawSingleGraph(
    ctx,
    msgHistory,
    `Message Latency (${msgLatency}ms)`,
    "#3498db",
    440,
    graphY,
    graphWidth,
    graphHeight,
    maxHistory
  );

  return canvas;
}

module.exports = { createLatencyCanvas };
