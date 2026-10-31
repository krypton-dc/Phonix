const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { createInviteBanner } = require("@custom/gen/invCard.js");

module.exports = {
  name: "invite",
  aliases: ["inv"],
  category: "Information",
  description: "Get the invite link for bot.",
  cooldown: 3,

  execute: async (message, args, client) => {
    await client.user.fetch();

    let srv = 0,
      xx = 0;

    if (client.cluster) {
      const results = await client.cluster.broadcastEval((c) => {
        const allChannels = [...c.channels.cache.values()];
        return {
          servers: c.guilds.cache.size,
          users: c.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        };
      });

      for (const res of results) {
        srv += res.servers;
        xx += res.users;
      }
    } else {
      srv = client.guilds.cache.size;
      xx = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    }
    const u = client.numb(xx);
    const s = client.numb(srv);
    const buffer = await createInviteBanner(client.user, u, s);
    const file = new AttachmentBuilder(buffer, { name: "invite-banner.png" });

    const inviteURL = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Invite")
        .setURL(inviteURL)
    );

    message.channel.send({
      files: [file],
      components: [row],
    });
  },
};
