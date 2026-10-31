const fs = require("fs");
const path = require("path");

module.exports = async (client) => {
  const eventsPath = path.join(__dirname, "../events/Custom");
  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"));
  let loaded = 0;

  for (const file of files) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);
      if (!event?.name || typeof event?.run !== "function") {
        console.warn(
          `[Phonix][CUSTOM EVENTS] ❌ Skipped: ${file} is missing 'name' or 'run'`
        );
        continue;
      }

      client.on(event.name, (...args) => event.run(client, ...args));

      loaded++;
      client.logger.log(`Custom Event Loaded: ${file}`, "event");
    } catch (err) {
      console.error(`[Phonix][CUSTOM EVENTS] ❌ Failed: ${file}\n`, err);
    }
  }

  return loaded;
};
