const { prefix } = require("../../config.js");
module.exports = {
  name: "clientReady",
  run: async (client) => {
    let srv = 0,
      xx = 0;
    if (client.cluster) {
      const results = await client.cluster.broadcastEval((c) => {
        return {
          servers: c.guilds.cache.size,
          users: c.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        };
      });
      for (const res of results) {
        srv += res.servers;
        xx += res.users;
      }
    } else {
      srv = client.guilds.cache.size;
      xx = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    }
    const u = client.numb(xx);
    const s = client.numb(srv);
    const owner = client.users.cache.get(client.owner);
    const user = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    client.logger.log(`Made By Krypton_.`, "ready");
    client.logger.log(`${client.user.username} online!`, "ready");
    client.logger.log(
      `Ready on ${client.numb(s)} servers, for a total of ${client.numb(u)} users`,
      "ready"
    );
    const statuses = [
      "Music that never stops",
      "Protecting servers with style",
      "Serving " + client.numb(s) + " servers",
      "Helping " + client.numb(u) + " users",
      "Type ?help for commands",
      "Powered by Phonix HQ",
    ];
    setInterval(function () {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      client.user.setPresence({
        activities: [{
          name: "Custom Status",
          type: 4,
          state: status
        }],
        status: "online"
      });
    }, 5000);
  },
};