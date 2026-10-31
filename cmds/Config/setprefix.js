const { MessageFlags } = require("discord.js");
const db = require("@data/prefix.js");

module.exports = {
  name: "setprefix",
  category: "Config",
  description: "Sets a custom prefix.",
  args: false,
  usage: "<prefix>",
  aliases: ["prefix"],
  botPrams: ["EmbedLinks"],
  userPerms: ["ManageGuild"],
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const data = await db.findOne({ Guild: message.guildId });
    const newPrefix = args.join(" ");

    if (!newPrefix) {
        const x = client.box()
            .text(`${client.emoji.cross} | Provide a new prefix`)
      message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }

    if (newPrefix.length > 3) {
                  const x = client.box()
            .text(`Prefix can't exceed 3 characters!`)
     message.reply({components: [x], flags: MessageFlags.IsComponentsV2});
    }

    if (!data) {
      const newData = new db({
        Guild: message.guildId,
        Prefix: newPrefix,
        oldPrefix: prefix,
      });
      await newData.save();
    } else {
      data.oldPrefix = prefix;
      data.Prefix = newPrefix;
      try {
        await data.save();
      } catch (err) {
        console.error(err);
        return message.reply({
          embeds: [
            new client.embed()
              .setDescription(
                `An error occurred while updating the prefix: ${err.message}`
              )
              .setColor(client.color),
          ],
        });
      }
    }

      const x = client.box()
          .text(`Prefix updated to: ${newPrefix}`);
    return message.reply({components: [x], flags: MessageFlags.IsComponentsV2
    });
  },
};
