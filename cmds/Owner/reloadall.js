const fs = require("fs");

module.exports = {
  name: "reloadall",
  category: "Owner",
  aliases: ["rdall"],
  description: "Reload all commands in the bot.",
  args: false,
  usage: "",
  permission: [],
  owner: true,
  execute: async (message, args, client, prefix) => {
    try {
      const commandsDir = `${process.cwd()}/cmds`;
      client.commands.clear();
      const categories = fs.readdirSync(commandsDir);

      for (const category of categories) {
        const categoryPath = `${commandsDir}/${category}`;
        if (!fs.lstatSync(categoryPath).isDirectory()) continue;
        const commandFiles = fs
          .readdirSync(categoryPath)
          .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
          const commandPath = `${categoryPath}/${file}`;

          // Delete the cached version of the command
          delete require.cache[require.resolve(commandPath)];

          // Re-require and load the command
          const command = require(commandPath);

          // Add the command to the collection
          if (command.name) {
            client.commands.set(command.name, command);
          }
        }
      }

      // Send a success message
      return message.channel.send(
        ` All commands have been successfully reloaded!`
      );
    } catch (error) {
      console.error(error);
      return message.channel.send(
        `❌ An error occurred while reloading commands:\n\`${error.message}\``
      );
    }
  },
};
