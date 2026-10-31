const { ActionRowBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "steal",
  category: "Moderation",
  aliases: ["stealemoji", "stealsticker", "addemoji", "addsticker"],
  description: "Steal emojis or stickers from messages using an interactive UI.",
  args: false,
  usage: "steal <reply/emojis/urls>",
  userPerms: ["ManageEmojisAndStickers"],
  botPerms: ["ManageEmojisAndStickers"],

  execute: async (message, args, client, prefix) => {
    let targetMessage = message;
    let contentToProcess = [];

    if (message.reference) {
      try {
        targetMessage = await message.channel.messages.fetch(message.reference.messageId);
        contentToProcess = targetMessage.content.trim().split(/\s+/).filter(Boolean);
      } catch {
        return message.reply("Couldn't fetch the referenced message.");
      }
    } else if (args.length > 0) {
      contentToProcess = args;
    } else {
      const dabba = client
        .box()
        .text(`${client.emoji.cross} | Provide emojis/URLs or reply to a message containing them.`);
      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [dabba],
      });
    }

    const emojis = [];
    const stickers = [];

    // Stickers
    if (targetMessage.stickers?.size > 0) {
      targetMessage.stickers.forEach(sticker => {
        stickers.push({
          id: sticker.id,
          name: sticker.name,
          tags: sticker.tags || "fun",
          url: `https://media.discordapp.net/stickers/${sticker.id}.png`,
        });
      });
    }

    // Emojis / URLs
    for (const item of contentToProcess) {
      if (item.startsWith("<") && item.endsWith(">")) {
        const match = item.match(/<?a?:?(\w+):(\d+)>?/);
        if (match) {
          const [, emojiName, emojiID] = match;
          const type = await axios
            .get(`https://cdn.discordapp.com/emojis/${emojiID}.gif`)
            .then(() => "gif")
            .catch(() => "png");

          emojis.push({
            name: emojiName,
            id: emojiID,
            url: `https://cdn.discordapp.com/emojis/${emojiID}.${type}?quality=lossless`,
            animated: type === "gif",
          });
        }
      } else if (isValidUrl(item)) {
        const name = item.split("/").pop().split(".")[0].slice(0, 32) || `emoji_${Date.now()}`;
        emojis.push({
          name,
          url: item,
          animated: item.includes(".gif"),
        });
      }
    }

    if (!emojis.length && !stickers.length) {
      const dabba = client.box().text(`${client.emoji.cross} | No valid emojis or stickers found.`);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [dabba] });
    }

    // Pagination setup
    const allItems = [...emojis.map(e => ({ ...e, type: "emoji" })), ...stickers.map(s => ({ ...s, type: "sticker" }))];
    let page = 0;

          const createButtons = (index) => {
  const row1 = new ActionRowBuilder().addComponents(
    new client.button().s("steal_left", "", client.emoji.left, index === 0),
    new client.button().s("page_info", `${index + 1}/${allItems.length}`, ``, true),
    new client.button().s("steal_right", "", client.emoji.right, index === allItems.length - 1),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new client.button().s("steal_as_emoji", "As Emoji", ``),
    new client.button().s("steal_as_sticker", "As Sticker", ``),
    new client.button().s("steal_all", "Steal All", ``),
  );

  return [row1, row2];
};
      
    const createPage = (index) => {
      const item = allItems[index];
      const dabba = client
        .box()
        .sep()
        .text(`**Type:** \`${item.type}\``)
        .sep()
        .text(`**Name:** \`${item.name}\``)
        .media(item.url)
        .addActionRowComponents(...createButtons(page));
      return dabba;
    };
      
    const msg = await message.channel.send({
  flags: MessageFlags.IsComponentsV2,
  components: [createPage(page)],
});


    // Collector (CV2-compatible)
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      if (i.customId === "steal_left" && page > 0) page--;
      if (i.customId === "steal_right" && page < allItems.length - 1) page++;

      if (i.customId === "steal_as_emoji") return stealAsEmoji(i, allItems[page], message, client);
      if (i.customId === "steal_as_sticker") return stealAsSticker(i, allItems[page], message, client);
      if (i.customId === "steal_all") return stealAllAsEmojis(i, allItems, message, client);

await i.editReply({
  flags: MessageFlags.IsComponentsV2,
  components: [createPage(page), ...createButtons(page)],
});

    });

    collector.on("end", async () => {
      const row = createButtons(page);
      row.components.forEach((b) => b.setDisabled(true));
      await msg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [createPage(page), row],
      });
    });
  },
};

// Utility functions
async function stealAsEmoji(interaction, item, message, client) {
  try {
    const emoji = await message.guild.emojis.create({
      attachment: item.url,
      name: item.name.slice(0, 32),
    });

    const dabba = client
      .box()
      .text(`#Emoji Added!`)
      .sep()
      .text(`**Name:** \`${emoji.name}\`\n**Animated:** ${emoji.animated ? "✅" : "❌"}\n**ID:** \`${emoji.id}\``)
      .media(emoji.url);

    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [dabba],
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);
    const dabba = client
      .box()
      .text(`# ❌ Failed to Add Emoji`)
      .sep()
      .text(`Possible reasons:\n• Emoji slots full\n• Invalid format\n• Name too long\n• File too large`);
    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [dabba],
      ephemeral: true,
    });
  }
}

async function stealAsSticker(interaction, item, message, client) {
  try {
    const sticker = await message.guild.stickers.create({
      file: item.url,
      name: item.name.slice(0, 30),
      tags: item.tags || "stolen",
    });

    const dabba = client
      .box()
      .text(`#Sticker Added!`)
      .sep()
      .text(`**Name:** \`${sticker.name}\`\n**Tags:** \`${sticker.tags}\`\n**ID:** \`${sticker.id}\``)
      .media(sticker.url);

    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [dabba],
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);
    const dabba = client
      .box()
      .text(`# ❌ Failed to Add Sticker`)
      .sep()
      .text(`Possible reasons:\n• Server not boosted enough\n• File size too large\n• Format invalid`);
    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2,
      components: [dabba],
      ephemeral: true,
    });
  }
}

async function stealAllAsEmojis(interaction, items, message, client) {
  const added = [];
  const failed = [];

  for (let i = 0; i < Math.min(items.length, 50); i++) {
    const item = items[i];
    try {
      const emoji = await message.guild.emojis.create({
        attachment: item.url,
        name: `${item.name}_${i}`.slice(0, 32),
      });
      added.push(`${emoji.toString()} \`${emoji.name}\``);
    } catch {
      failed.push(item.name);
    }
  }

  const dabba = client
    .box()
    .text(`# 📊 Bulk Steal Results`)
    .sep()
    .text(
      ` **Added:** ${added.length}\n❌ **Failed:** ${failed.length}\n\n` +
        (added.length ? added.slice(0, 10).join("\n") : "No emojis added."),
    );

  await interaction.followUp({
    flags: MessageFlags.IsComponentsV2,
    components: [dabba],
    ephemeral: true,
  });
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
