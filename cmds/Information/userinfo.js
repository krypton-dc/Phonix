const axios = require("axios");

module.exports = {
  name: "userinfo",
  category: "Information",
  cooldown: 3,
  aliases: ["ui", "whois"],
  description: "Get information about a user.",
  args: false,
  usage: "<MENTION>",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const flagg = {
      "": "None",
      Staff: "<:staff:1230959557942186061>",
      Partner: "<:partner:1230959788087840769>",
      BugHunterLevel1: "<:BugHunter:1230959967008325673>",
      HypeSquad: "<:hype_squad:1230960190858199040>",
      BugHunterLevel2: "<:BugHunterLevel2:1230960348723679333>",
      HypeSquadOnlineHouse3: "<:HypeSquad_Balance:1230957877708197959>",
      HypeSquadOnlineHouse2: "<:HypeSquad2:1230957852043247678>",
      HypeSquadOnlineHouse1: "<:HypeSquad_Bravery:1230957863015546902>",
      PremiumEarlySupporter: "<:PremiumEarlySupporter:1230960751997620276>",
      VerifiedBot: "<:verified_bot:1230961050208178186>",
      VerifiedDeveloper: "<:VerifiedDeveloper:1230961198133153992>",
      CertifiedModerator: "<:CertifiedModerator:1231133794757771304>",
      ActiveDeveloper: "<:ActiveDeveloper:1231133698758545499>",
    };

    const mention1 =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.member;

    const filter = { owner: message.guild.ownerId === mention1.id };

    // Get user badges
    const badges =
      mention1.user.flags?.toArray().map((flag) => flagg[flag]) || [];

    if (mention1.avatar && mention1.avatar.startsWith("a_"))
      badges.push(flagg["PremiumEarlySupporter"]);

    // Permissions Mapping
    const permissions = {
      Administrator: "Administrator",
      ManageGuild: "Manage Server",
      ManageRoles: "Manage Roles",
      ManageChannels: "Manage Channels",
      KickMembers: "Kick Members",
      BanMembers: "Ban Members",
      ManageNicknames: "Manage Nicknames",
      ManageEmojis: "Manage Emojis",
      ManageWebhooks: "Manage Webhooks",
      ManageMessages: "Manage Messages",
      MentionEveryone: "Mention Everyone",
      ReadMessageHistory: "Read Message History",
      MuteMembers: "Mute Members",
      DeafenMembers: "Deafen Members",
      MoveMembers: "Move Members",
      ViewAuditLog: "View Audit Log",
    };

    // Determine User Rank
    let acknowledgement = "Server Member";
    if (filter.owner) acknowledgement = "Server Owner";
    else if (mention1.permissions.has("Administrator"))
      acknowledgement = "Server Admin";
    else if (
      mention1.permissions.has([
        "ManageMessages",
        "ManageNicknames",
        "ReadMessageHistory",
        "MuteMembers",
        "DeafenMembers",
        "MoveMembers",
        "ViewAuditLog",
      ])
    )
      acknowledgement = "Moderator";

    // Get Role Information
    const nick = mention1.nickname || "None";
    const roless = mention1.roles.cache
      .filter((x) => x.id !== message.guildId && !x.managed)
      .sort((a, b) => b.position - a.position)
      .map((x) => x.toString());

    // Get User Avatar
    const usericon = mention1.user.displayAvatarURL({ dynamic: true });

    // Get Permissions
    const mentionPermissions = mention1.permissions.toArray();
    const finalPermissions = Object.keys(permissions).filter((perm) =>
      mentionPermissions.includes(perm)
    );

    // Fetch user banner
    let bannerUrl = null;
    try {
      const { data } = await axios.get(
        `https://discord.com/api/users/${mention1.id}`,
        {
          headers: { Authorization: `Bot ${client.token}` },
        }
      );
      if (data.banner) {
        const ext = data.banner.startsWith("a_") ? ".gif" : ".png";
        bannerUrl = `https://cdn.discordapp.com/banners/${mention1.id}/${data.banner}${ext}?size=4096`;
      }
    } catch (err) {
      console.error("Failed to fetch user banner:", err);
    }

    // Create Embed
    const userlol = new client.embed()
      .setTitle(`${mention1.user.username}'s Information`)
      .addFields([
        {
          name: `<:inv:1220409952921981021> About`,
          value: `>>> **Default Name:** ${mention1.user.username}
**Global Name:** [${mention1.user.displayName}](https://discord.com/users/${
            mention1.id
          })
**Mention:** ${mention1}
**ID:** \`${mention1.user.id}\`
**Nickname:** ${nick}
**Badges:** ${badges.length ? badges.join(" ") : "None"}
**Created On:** <t:${Math.round(mention1.user.createdTimestamp / 1000)}:f>
**Joined On:** <t:${Math.round(mention1.joinedTimestamp / 1000)}:f>
**Activity:** ${
            mention1.presence?.activities[0]
              ? mention1.presence?.activities[0].name
              : "No Current Activity."
          }
**Bot?:** ${mention1?.bot ? client.emoji.tick : client.emoji.cross}`,
        },
        {
          name: `<:support:1220409940943048784> Role Info`,
          value: `>>> **Highest Role:** ${
            mention1.roles.highest.id === message.guild.id
              ? "No Highest Role."
              : mention1.roles.highest
          }
**Hoist Role:** ${mention1.roles.hoist || "No Hoist Role."}
**Roles:** ${
            mention1._roles.length > 0
              ? `<@&${mention1._roles.join("> <@&")}>`
              : "No Roles."
          }
**Color:** ${mention1.displayHexColor}`,
        },
        {
          name: "<:profile:1224281268934414427> Key Permissions",
          value: `\`${finalPermissions.join(", ")}\``,
        },
      ]);

    if (acknowledgement)
      userlol.addFields([
        {
          name: "<:privacy:1220409917278523473> Acknowledgements",
          value: `\`${acknowledgement}\``,
        },
      ]);

    userlol.setThumbnail(usericon);
    if (bannerUrl) userlol.setImage(bannerUrl);

    userlol.setFooter({
      text: `Requested By: ${message.author.tag}`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    });

    userlol.setTimestamp();

    return message
      .reply({ embeds: [userlol], allowedMentions: { repliedUser: true } })
      .catch((err) => message.reply("Error: " + err));
  },
};
