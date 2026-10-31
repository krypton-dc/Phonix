const { MessageFlags } = require(`discord.js`);

module.exports = {
  name: "node",
  category: "Owner",
  description: "xD node information.",
  botPrams: ["EmbedLinks"],
  owner: true,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const all = [...client.manager.shoukaku.nodes.values()]
      .map(
        (node) =>
          `Node ${client.user.username} is ${node.stats ? "Connected" : "Disconnected"}` +
          `\nPlayer: ${node.stats.players}` +
          `\nPlaying Players: ${node.stats.playingPlayers}` +
          `\nUptime: ${new Date(node.stats.uptime).toISOString().slice(11, 19)}` +
          `\n\nMemory` +
          `\nReservable Memory: ${Math.round(node.stats.memory.reservable / 1024 / 1024)}mb` +
          `\nUsed Memory: ${Math.round(node.stats.memory.used / 1024 / 1024)}mb` +
          `\nFree Memory: ${Math.round(node.stats.memory.free / 1024 / 1024)}mb` +
          `\nAllocated Memory: ${Math.round(node.stats.memory.allocated / 1024 / 1024)}mb` +
          `\n\nCPU` +
          `\nCores: ${node.stats.cpu.cores}` +
          `\nSystem Load: ${(Math.round(node.stats.cpu.systemLoad * 100) / 100).toFixed(2)}%` +
          `\nLavalink Load: ${(Math.round(node.stats.cpu.lavalinkLoad * 100) / 100).toFixed(2)}%`
      )
      .join("\n\n----------------------------\n");

    const x = client.box().text(`# ${client.emoji.boticon} Phonix Lavalink Status`).sep().text(`${all ? all : "Node: Disconnected"}`).sep().text(`-# Req By: ${message.author.username}`);
    message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
  },
};
