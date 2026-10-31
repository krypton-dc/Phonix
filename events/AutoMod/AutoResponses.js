const Autoresponder = require("@data/autoresponder");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    // Ignore messages from bots and non-guild channels
    if (!message.guild || message.author.bot) return;

    try {
      // Find a single autoresponder document that matches the guild ID
      // and the lowercase message content as the trigger.
      const arData = await Autoresponder.findOne({
        guildId: message.guild.id,
        trigger: message.content.toLowerCase(),
      });

      // If a matching autoresponder is found, send the response.
      if (arData) {
        await message.channel.send(arData.response);
      }
    } catch (error) {
      console.error(`Error handling autoresponder: ${error.message}`);
    }
  },
};
