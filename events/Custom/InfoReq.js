const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "InfoReq",
  run: async (client, message, command) => {
    const box = new ContainerBuilder();
    const boxText = new TextDisplayBuilder().setContent(
      `> - **Name:** ${command.name}\n` +
        `> - **Aliases:** ${
          command.aliases?.[0] ? `${command.aliases.join(", ")}` : "No aliases"
        }\n` +
        `> - **Usage:** ${client.prefix}${command.name} ${command.usage ? command.usage : ` \`Not Set\` `}\n` +
        `> - **Description:** ${command.description || `No description available`}\n\n`
    );
    const separator2 = new SeparatorBuilder();
    const textt = new TextDisplayBuilder().setContent(
      `\`\`\`js\n<> = required | [] = optional\n\`\`\``
    );

    const bo1 = new TextDisplayBuilder().setContent(
      `# ${client.emoji.boticon} ${command.name.charAt(0).toUpperCase() + command.name.slice(1)} | info`
    );
    box.addTextDisplayComponents(bo1);
    box.addTextDisplayComponents(boxText);
    box.addSeparatorComponents(separator2);
    box.addTextDisplayComponents(textt);

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });
  },
};
