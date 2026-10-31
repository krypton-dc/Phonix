const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const NopAccess = require("@data/accessnop");
const db = require("@data/noprefix");

module.exports = {
  name: "noprefix",
  aliases: ["nop"],
  category: "Owner",
  description: "Manage NoPrefix status and tiers for users.",
  args: true,
  usage: "<user | list>",
  execute: async (message, args, client) => {
    const access = await NopAccess.findOne({ userId: message.author.id });
    if (!access)
      return message.channel.send(
        "___You are not allowed to use this command!___"
      );

    if (args[0].toLowerCase() === "list") {
      const data = await db.find({ noprefix: true });

      if (!data.length)
        return message.reply("There is no user in my NoPrefix system.");

      const now = Date.now();
      const validUsers = data.filter((x) => !x.expiresAt || x.expiresAt > now);

      if (!validUsers.length)
        return message.reply("All NoPrefix users have expired.");
      const users = await Promise.all(
        validUsers.map(async (x) => {
          try {
            return await client.users.fetch(x.userId);
          } catch {
            return null;
          }
        })
      ).then((list) => list.filter((user) => user !== null));

      const pages = [];
      for (let i = 0; i < users.length; i += 10) {
        const page = users
          .slice(i, i + 10)
          .map((user, index) => {
            const entry = validUsers.find((x) => x.userId === user.id);
            const timeLeft = entry.expiresAt
              ? `<t:${Math.floor(new Date(entry.expiresAt).getTime() / 1000)}:R>`
              : "Permanent";
            return `> \`${i + index + 1}.\` [__${user.username}__](https://discord.com/users/${user.id}) - **Time Left:** ${timeLeft}`;
          })
          .join("\n");

        pages.push(page);
      }

      let page = 0;
      const createEmbed = () => client.box()
          .text(`# ${client.emoji.boticon} NoPrefix List`)
          .text(pages[page])
          .media(client.config.links.icon)
          .text(`-# Page ${page + 1}/${pages.length}`);

      if (users.length <= 10) {
        return message.channel.send({ components: [createEmbed()], flags: MessageFlags.IsComponentsV2 });
      } else {
const row = new ActionRowBuilder().addComponents([
    new client.button().s(`nop_list_previous`, ``, client.emoji.left),
    new client.button().s(`nop_list_stop`, ``, client.emoji.delete),
    new client.button().s(`nop_list_next`, ``, client.emoji.right)
]);

           const embedBox = createEmbed(); 
          embedBox.addActionRowComponents(row);

        const msg = await message.channel.send({ 
            components: [embedBox()],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = msg.createMessageComponentCollector({
          filter: (b) => {
            if (b.user.id === message.author.id) return true;
            b.reply({
              flags: MessageFlags.Ephemeral,
              content: `Only **${message.author.tag}** can use this button.`,
            });
            return false;
          },
          time: 60000 * 5,
          idle: 60000 * 2,
        });

        collector.on("collect", async (button) => {
          await button.deferUpdate().catch(() => {});

          if (button.customId === "nop_list_next") {
            page = (page + 1) % pages.length;
          } else if (button.customId === "nop_list_previous") {
            page = (page - 1 + pages.length) % pages.length;
          } else if (button.customId === "nop_list_stop") {
            return collector.stop();
          }

          await msg.edit({ components: [createEmbed()], flags: MessageFlags.IsComponentsV2 });
        });

        collector.on("end", () => msg.edit({ components: [] }));
      }
      return;
    }

    // Fetch user properly
    const user = await (async () => {
      if (message.mentions.users.first()) return message.mentions.users.first();
      if (args[0]) {
        try {
          return await client.users.fetch(args[0]);
        } catch {
          return null;
        }
      }
      return null;
    })();

    if (!user)
      return message.reply("Please mention a user or provide a valid user ID.");

    const noprefixData = await db.findOne({ userId: user.id });
    const timeLeft = noprefixData?.expiresAt
      ? `<t:${Math.floor(new Date(noprefixData.expiresAt).getTime() / 1000)}:R>`
      : noprefixData
        ? "Permanent"
        : "No NoPrefix assigned";

    const userEmbed = client.box()
      .text(`# ${user.username}'s NoPrefix Management`)
      .sep()
      .text(`Current Status\n ${timeLeft}`);

    const row = new ActionRowBuilder().addComponents(
        new client.button().s(noprefixData ? "remove-noprefix" : "add-noprefix", noprefixData ? "Remove NoPrefix" : "Add NoPrefix")
        )

    userEmbed.addActionRowComponents(row)
    const msg = await message.channel.send({
      components: [userEmbed],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "You cannot use this button.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "remove-noprefix") {
        await db.deleteOne({ userId: user.id });
          const x = client.box().text(`${client.emoji.tick} Removed **NoPrefix** from ${user}.`)
        return interaction.update({
          components: [x],
          flags: MessageFlags.IsComponentsV2
        });
      }

      if (interaction.customId === "add-noprefix") {
        const tierMenu = new StringSelectMenuBuilder()
  .setCustomId("noprefix_tier_select")
  .setPlaceholder("Select a NoPrefix tier")
  .addOptions([
    {
      label: "Bronze (1 Day)",
      value: "bronze",
      description: "Assign Bronze tier NoPrefix (1 Day)",
      emoji: '1430321042290638868'
    },
    {
      label: "Silver (1 Week)",
      value: "silver",
      description: "Assign Silver tier NoPrefix (1 Week)",
      emoji: '1430320932316254279'
    },
    {
      label: "Gold (1 Month)",
      value: "gold",
      description: "Assign Gold tier NoPrefix (1 Month)",
        emoji: '1430320930160120000'
    },
    {
      label: "Diamond (Permanent)",
      value: "diamond",
      description: "Assign Diamond tier NoPrefix (Permanent)",
      emoji: '1430320927593332737'
    },
  ]);
          const v = client.box().text(`Select a tier to assign NoPrefix:`)
          
          const tierRow = new ActionRowBuilder().addComponents(tierMenu);
          v.addActionRowComponents(tierRow)
        await interaction.update({
          components: [v],
           flags: MessageFlags.IsComponentsV2
        });

        const tierCollector = msg.createMessageComponentCollector({
          time: 30000,
        });

  tierCollector.on("collect", async (tierInteraction) => {
    if (tierInteraction.user.id !== message.author.id) {
      return tierInteraction.reply({
        content: "You cannot use this dropdown.",
        flags: MessageFlags.Ephemeral
      });
    }

    const selected = tierInteraction.values[0]; 
    const expiresAt = selected === "diamond"
      ? null
      : Date.now() + { bronze: 86400000, silver: 604800000, gold: 2592000000 }[selected];

    await db.updateOne(
      { userId: user.id },
      { userId: user.id, noprefix: true, expiresAt },
      { upsert: true }
    );

    const resultBox = client.box().text(
      `${client.emoji.tick} Assigned **${selected.toUpperCase()}** NoPrefix to ${user}.`
    );

    await tierInteraction.update({
      components: [resultBox],
      flags: MessageFlags.IsComponentsV2
    });

    tierCollector.stop();
  });

  tierCollector.on("end", () => {
    msg.edit({ components: [] });
  });
}
    });

    collector.on("end", () => msg.edit({ components: [] }));
  },
};
