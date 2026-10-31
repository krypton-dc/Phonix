const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const NopAccess = require("@data/accessnop");

module.exports = {
  name: "help",
  category: "Information",
  aliases: ["h"],
  description: "Shows the help menu.",
  args: false,
  usage: "",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const commandsPath = path.join(__dirname, "../../cmds");
    const categories = [];

    for (const folder of fs
      .readdirSync(commandsPath)
      .filter((f) => f.toLowerCase() !== "owner")) {
      const folderPath = path.join(commandsPath, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const commands = [];
      for (const file of fs
        .readdirSync(folderPath)
        .filter((f) => f.endsWith(".js"))) {
        const cmd = require(path.join(folderPath, file));
        if (cmd?.name) commands.push(cmd);
      }

      categories.push({
        name: folder,
        emoji: client.emoji[folder.toLowerCase()] || client.emoji.q || "📁",
        id: categories.length + 1,
        commands,
      });
    }

    const found = await NopAccess.findOne({ userId: message.author.id });
    const infoLine = `${client.emoji.dot} **Total Commands:** \`${client.commands.size}\` | **Usable by you:** \`${found ? client.commands.size : client.commands.size - 9}\``;

    const mainCategoryNames = [
      "automod",
      "config",
      "giveaway",
      "moderation",
      "role",
      "ticket",
      "welcome",
    ];

    const mainCategories = categories.filter((cat) =>
      mainCategoryNames.includes(cat.name.toLowerCase())
    );

    const otherCategories = categories.filter(
      (cat) => !mainCategoryNames.includes(cat.name.toLowerCase())
    );
      
    const containers = categories.map((cat) => {
      const commandList = cat.commands.map((c) => `\`${c.name}\``).join(", ");

      const categoryContainer = new ContainerBuilder();
      const categoryText = new TextDisplayBuilder().setContent(
        `# ${cat.name} | ${cat.commands.length} command(s)\n\n${commandList.length ? commandList : "No commands available."}\n\n*Use ${prefix}<command> ?h for details*`
      );

      categoryContainer.addTextDisplayComponents(categoryText);

      return categoryContainer;
    });
    const mainContainer = new ContainerBuilder();
    const headerText = new TextDisplayBuilder().setContent(
      `# Help Menu\n\n**${client.emoji.dot} Type \`${prefix}help <command>\` to get detailed info**\n${infoLine}\n${client.emoji.dot} [**Invite**](${client.config.links.invite}) | [**Support**](${client.config.links.support}) | [**Vote**](${client.config.links.voteuri}) | [**Website**](${client.config.links.website})`
    );

    mainContainer.addTextDisplayComponents(headerText);

    const separator1 = new SeparatorBuilder();
    mainContainer.addSeparatorComponents(separator1);

    const mainCatText = new TextDisplayBuilder().setContent(
      `## Main Categories\n\n${
        mainCategories
          .map((cat) => `> ${cat.emoji} **${cat.name}**`)
          .join("\n") || "No main categories found."
      }`
    );

    mainContainer.addTextDisplayComponents(mainCatText);

    const otherCatText = new TextDisplayBuilder().setContent(
      `## Other Categories\n\n${
        otherCategories
          .map((cat) => `> ${cat.emoji} **${cat.name}**`)
          .join("\n") || "No other categories found."
      }`
    );

    mainContainer.addTextDisplayComponents(otherCatText);
    const separator2 = new SeparatorBuilder();
    mainContainer.addSeparatorComponents(separator2);
    if (mainCategories.length > 0) {
      const mainMenu = new StringSelectMenuBuilder()
        .setCustomId("help_main")
        .setPlaceholder("Main Categories")
        .addOptions(
          mainCategories.map((cat) => ({
            label: cat.name,
            value: `main_${cat.id}`,
            emoji: cat.emoji,
          }))
        );

      const mainMenuRow = new ActionRowBuilder().setComponents([mainMenu]);
      mainContainer.addActionRowComponents(mainMenuRow);
    }

    if (otherCategories.length > 0) {
      const otherMenu = new StringSelectMenuBuilder()
        .setCustomId("help_other")
        .setPlaceholder("Other Categories")
        .addOptions(
          otherCategories.map((cat) => ({
            label: cat.name,
            value: `other_${cat.id}`,
            emoji: cat.emoji,
          }))
        );

      const otherMenuRow = new ActionRowBuilder().setComponents([otherMenu]);
      mainContainer.addActionRowComponents(otherMenuRow);
    }

    const img = new MediaGalleryBuilder().addItems([
      {
        media: {
          url: client.config.links.icon,
        },
      },
    ]);
    mainContainer.addMediaGalleryComponents(img);

    const msg = await message.channel.send({
      components: [mainContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.isStringSelectMenu()) {
          const [type, rawId] = interaction.values[0].split("_");
          const selected = parseInt(rawId, 10);

          const catList = type === "main" ? mainCategories : otherCategories;
          const cat = catList.find((c) => c.id === selected);
          const pageIndex = categories.findIndex((c) => c.name === cat?.name);

          if (!cat || pageIndex === -1) {
            return interaction.reply({
              content: "Invalid selection.",
              ephemeral: true,
            });
          }

          // Add back button to the category container
          const categoryWithButton = new ContainerBuilder();
          const categoryText = new TextDisplayBuilder().setContent(
            `# ${cat.name} | ${cat.commands.length} command(s)\n\n${cat.commands.map((c) => `\`${c.name}\``).join(", ") || "No commands available."}\n\n-# *Use ${prefix} <command> ?h for details*`
          );

          categoryWithButton.addTextDisplayComponents(categoryText);

          const backButton = new ButtonBuilder()
            .setCustomId("back")
            .setLabel("Back")
            .setStyle(ButtonStyle.Secondary);

          const backRow = new ActionRowBuilder().setComponents([backButton]);
          categoryWithButton.addActionRowComponents(backRow);

          await interaction.update({
            components: [categoryWithButton],
            flags: MessageFlags.IsComponentsV2,
          });
        }

        if (interaction.isButton() && interaction.customId === "back") {
          await interaction.update({
            components: [mainContainer],
            flags: MessageFlags.IsComponentsV2,
          });
        }
      } catch (err) {
        console.error("Help Error:", err);
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content: "An error occurred while processing your interaction.",
              ephemeral: true,
            });
          } catch (replyErr) {
            console.error("Failed to send error reply:", replyErr);
          }
        }
      }
    });

    collector.on("end", () => {
      if (msg.editable) {
        msg.edit({ components: [] }).catch(() => null);
      }
    });
  },
};
