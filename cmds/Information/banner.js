const { MessageFlags, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "banner",
  category: "Information",
  cooldown: 3,
  description: "View the server banner or a user's banner.",
  args: false,
  usage: "[user mention or ID]",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const button = new ActionRowBuilder().addComponents([
      new client.button().g("srvbanner", "Server Banner", ""),
      new client.button().p("usrbanner", "User Banner", ""),
    ]);

    const box = client.box();
    box.text("# Banner Viewer").sep();
    box.text("Choose **Server Banner** or **User Banner** below.");
    box.addActionRowComponents(button);

    const msg = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.customId === "srvbanner") {
          if (!message.guild.banner)
            return interaction.reply({
              content: "❌ This server has no banner set.",
              flags: MessageFlags.Ephemeral,
            });

          const srv = client.box();
          srv.text(`# ${message.guild.name}'s Banner`).sep();
          srv.media(message.guild.bannerURL({ size: 4096 }));
          srv.addActionRowComponents(button);

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [srv],
          });
        }

        else if (interaction.customId === "usrbanner") {
          // Determine which user to fetch
          const target =
            message.mentions.users.first() ||
            (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) ||
            message.author;

          const user = await client.users.fetch(target.id, { force: true });

          if (!user.banner)
            return interaction.reply({
              content: `❌ **${user.username}** doesn't have a banner set.`,
              flags: MessageFlags.Ephemeral,
            });

          const usr = client.box();
          usr.text(`# ${user.username}'s Banner`).sep();
          usr.media(user.bannerURL({ size: 4096 }));
          usr.addActionRowComponents(button);

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [usr],
          });
        }
      } catch (err) {
        console.error("Error handling interaction:", err);
        interaction.reply({
          content: "⚠️ Something went wrong fetching the banner.",
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        msg.edit({ components: [] }).catch(() => {});
      }
    });
  },
};
