require("module-alias/register");
const config = require("@root/config.js");
const { ClusterManager } = require("discord-hybrid-sharding");
const Logger = require("@plugs/Logger");

Logger.startup(
  "Phonix",
  ">",
  "en-US",
  "2.1.1",
  process.version,
  "MongoDB",
  20,
  144
);

[
  {
    file: "./custom/Phonix.js",
    token: config.token,
  },
].forEach((client) => {
  new ClusterManager(client.file, {
    restarts: {
      max: 5,
      interval: 1000,
    },
    respawn: true,
    mode: "worker",
    token: client.token,
    totalShards: "auto",
    shardsPerClusters: 2,
  })
    .on("shardCreate", (cluster) => {
      Logger.log(`[Shard ${cluster.id}] Spawned`, "ready");
    })
    .on("debug", (info) => {
      Logger.log(info, "ready");
    })
    .spawn({ timeout: -1 });
});
