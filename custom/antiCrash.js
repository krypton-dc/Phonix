module.exports = (client) => {
  client.logger.log(`[ Anti-Crash Is Ready ]`, "ready");

  process.on("unhandledRejection", (...args) => {
    if (args.includes("Player Destroy in")) return;
   // client.logger.log(`unhandledRejection ${args}`, "error");
    console.log(...args);
  });
  process.on("uncaughtException", (...args) => {
   // client.logger.log(`uncaughtException ${args}`, "error");
    console.log(...args);
  });
};