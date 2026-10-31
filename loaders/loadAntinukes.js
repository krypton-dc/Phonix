const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const antiNukePath = path.join(__dirname, "../events/Antinuke");
  if (!fs.existsSync(antiNukePath)) {
    client.logger.log("⚠️ Anti-Nuke Events Directory Missing", "warn");
    return;
  }
  let totalEvents = 0;
  fs.readdirSync(antiNukePath).forEach((file) => {
    const events = require(path.join(antiNukePath, file));
    const eventList = Array.isArray(events) ? events : [events];
    for (const evt of eventList) {
      if (!evt?.name || typeof evt.run !== "function") continue;
      client.on(evt.name, (...args) => evt.run(client, ...args));
      totalEvents++;
    }
  });

  client.logger.log(`Anti-Nuke Events Loaded: ${totalEvents}`, "event");
};
