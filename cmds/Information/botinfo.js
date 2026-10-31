const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  version,
  ActionRowBuilder,
} = require("discord.js");

const os = require("os");
const { getProjectStats } = require("@utils/projectStats");
const Team = require("@data/team");

module.exports = {
  name: "botinfo",
  category: "Information",
  aliases: ["status", "botinfo", "bi", "about", "dev", "abt", "stats"],
  description: "Displays bot stats and information.",
  botPrams: ["EmbedLinks"],
  usage: "To get the bot's status, use botinfo",
  userPerms: [],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    try {
      let teamData = await Team.findOne();
      if (!teamData) {
        teamData = {
          developer: [],
          owner: [],
          manager: [],
          staff: [],
          admin: [],
        };
      }

      // Uptime calculation
      const totalSeconds = Math.floor(client.uptime / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      let totalServers = 0,
        totalUsers = 0,
        totalChannels = 0,
        textChannels = 0,
        voiceChannels = 0,
        stageChannels = 0;
      const totalShards =
        client.cluster?.info?.TOTAL_SHARDS || client.shard?.count || 1;

      if (client.cluster) {
        const results = await client.cluster.broadcastEval((c) => {
          const allChannels = [...c.channels.cache.values()];
          return {
            servers: c.guilds.cache.size,
            users: c.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
            totalChannels: allChannels.length,
            textChannels: allChannels.filter((ch) => ch.type === 0).length,
            voiceChannels: allChannels.filter((ch) => ch.type === 2).length,
            stageChannels: allChannels.filter((ch) => ch.type === 13).length,
          };
        });
        for (const res of results) {
          totalServers += res.servers;
          totalUsers += res.users;
          totalChannels += res.totalChannels;
          textChannels += res.textChannels;
          voiceChannels += res.voiceChannels;
          stageChannels += res.stageChannels;
        }
      } else {
        totalServers = client.guilds.cache.size;
        totalUsers =
          client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
        const allChannels = [...client.channels.cache.values()];
        totalChannels = allChannels.length;
        textChannels = allChannels.filter((ch) => ch.type === 0).length;
        voiceChannels = allChannels.filter((ch) => ch.type === 2).length;
        stageChannels = allChannels.filter((ch) => ch.type === 13).length;
      }

      const memoryUsage = (
        process.memoryUsage().heapUsed /
        1024 /
        1024
      ).toFixed(1);
      const cpuModel = os.cpus()[0].model;
      const ping = Math.round(client.ws.ping);

      // Project stats
      const projectStats = getProjectStats(process.cwd());

      // ===== HOME CONTAINER =====
      const homeContainer = new ContainerBuilder();
      homeContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${client.emoji.boticon} Welcome to ${client.user.username}\n\n` +
            `**Status:** ${client.emoji.online} Online & Ready\n` +
            `**Version:** Latest Build: v2.1.1\n` +
            `**Commands:** ${client.commands.size} available\n\n` +
            `*Your all-in-one Discord bot solution*`
        )
      );
      homeContainer.addSeparatorComponents(new SeparatorBuilder());
      homeContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Quick Overview\n\n` +
            `**Servers:** ${client.numb(totalServers)}\n` +
            `**Users:** ${client.numb(totalUsers)}\n` +
            `**Uptime:** ${uptimeStr}\n` +
            `**Latency:** ${ping}ms`
        )
      );
      homeContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Features\n\n` +
            `• **Moderation Tools**\n` +
            `• **Music & Entertainment**\n` +
            `• **Utility Commands**\n` +
            `• **Auto Moderation**\n` +
            `• **Custom Configurations**`
        )
      );
      homeContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${client.emoji.links} Important Links\n\n` +
            `[Support Server](${client.config.links.support}) • ` +
            `[Website](${client.web})`
        )
      );

      // ===== STATS CONTAINER =====
      const statsContainer = new ContainerBuilder();
      statsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Bot Statistics\n\n` +
            `**Bot Name:** ${client.user.username}\n` +
            `**Created:** <t:${Math.floor(client.user.createdTimestamp / 1000)}:D>\n` +
            `**Uptime:** ${uptimeStr}\n` +
            `**Commands:** ${client.commands.size} total\n` +
            `**Ping:** ${ping}ms\n` +
            `**Shards:** ${totalShards}`
        )
      );
      statsContainer.addSeparatorComponents(new SeparatorBuilder());
      statsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Server Statistics\n\n` +
            `**Guilds:** ${client.numb(totalServers)}\n` +
            `**Total Users:** ${client.numb(totalUsers)}\n` +
            `**Total Channels:** ${client.numb(totalChannels)}\n` +
            `**Text Channels:** ${client.numb(textChannels)}\n` +
            `**Voice Channels:** ${client.numb(voiceChannels)}\n` +
            `**Stage Channels:** ${client.numb(stageChannels)}`
        )
      );
      statsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Technical Info\n\n` +
            `**Discord.js:** v${version}\n` +
            `**Node.js:** ${process.version}\n` +
            `**Memory Usage:** ${memoryUsage} MB\n` +
            `**CPU:** ${cpuModel}\n` +
            `**Platform:** ${process.platform}\n` +
            `**Architecture:** ${process.arch}`
        )
      );

      statsContainer.addSeparatorComponents(new SeparatorBuilder());
      statsContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## Project Information\n\n` +
            `**Files:** ${client.numb(projectStats.files)}\n` +
            `**Folders:** ${client.numb(projectStats.folders)}\n` +
            `**Total Lines:** ${client.numb(projectStats.totalLines)}\n` +
            `**Minimum Lines in a File:** ${client.numb(projectStats.minLines)}`
        )
      );

      // ===== TEAM CONTAINER =====
      const teamContainer = new ContainerBuilder();
      teamContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${client.emoji.boticon} Team </3\n` +
            `> Meet the amazing people behind ${client.user.username}`
        )
      );
      teamContainer.addSeparatorComponents(new SeparatorBuilder());

      // ===== TEAM MEMBERS WITH STATUS =====
      const guild = client.config.links.guild;
      let teamMembersContent = "";

      const statusEmojis = {
        online: client.emoji.online,
        idle: client.emoji.idle,
        dnd: client.emoji.dnd,
        offline: client.emoji.offline,
      };

      async function getMemberStatus(guildd, id) {
        try {
          const me = client.guilds.cache.get(guildd);

          const member = await me.members.fetch(id).catch(() => null);
          if (!member)
            return {
              name: "Unknown User",
              status: "offline",
              emoji: statusEmojis.offline,
              id,
            };
          const status = member.presence?.status || "offline";
          return {
            name: member.displayName,
            status,
            emoji: statusEmojis[status] || statusEmojis.offline,
            id,
          };
        } catch {
          return {
            name: "Unknown User",
            status: "offline",
            emoji: statusEmojis.offline,
            id,
          };
        }
      }
      // Remove emojis + sanitize markdown
      // Works in Node.js 16+ with `u` (unicode) flag
      function sanitizeName(name) {
        return name.replace(/\p{Emoji}/gu, "").trim();
      }

      // Developer (keep original style)
      if (teamData.developer?.length) {
        teamMembersContent += `# ${client.emoji.ozuma} Developer\n`;
        for (const devId of teamData.developer) {
          const dev = await getMemberStatus(guild, devId);
          const displayName = sanitizeName(dev.name);
          teamMembersContent += `> - [**${displayName}**](https://discord.com/users/${dev.id}) ${dev.emoji}\n`;
        }
        teamMembersContent += `\n`;
      }

      // Owners
      if (teamData.owner?.length) {
        teamMembersContent += `> Owners\n`;
        for (const ownerId of teamData.owner) {
          const owner = await getMemberStatus(guild, ownerId);
          const displayName = sanitizeName(owner.name);
          teamMembersContent += `> - [**${displayName}**](https://discord.com/users/${owner.id}) ${owner.emoji}\n`;
        }
        teamMembersContent += `\n`;
      }

      // Managers
      if (teamData.manager?.length) {
        teamMembersContent += `> Managers\n`;
        for (const managerId of teamData.manager) {
          const manager = await getMemberStatus(guild, managerId);
          const displayName = sanitizeName(manager.name);
          teamMembersContent += `> - [**${displayName}**](https://discord.com/users/${manager.id}) ${manager.emoji}\n`;
        }
        teamMembersContent += `\n`;
      }

      // Admins
      if (teamData.admin?.length) {
        teamMembersContent += `> Admins\n`;
        for (const adminId of teamData.admin) {
          const admin = await getMemberStatus(guild, adminId);
          const displayName = sanitizeName(admin.name);
          teamMembersContent += `> - [**${displayName}**](https://discord.com/users/${admin.id}) ${admin.emoji}\n`;
        }
        teamMembersContent += `\n`;
      }

      // Staff
      if (teamData.staff?.length) {
        teamMembersContent += `> Staff\n`;
        for (const staffId of teamData.staff) {
          const staff = await getMemberStatus(guild, staffId);
          const displayName = sanitizeName(staff.name);
          teamMembersContent += `> - [**${displayName}**](https://discord.com/users/${staff.id}) ${staff.emoji}\n`;
        }
        teamMembersContent += `\n`;
      }

      if (!teamMembersContent) {
        teamMembersContent = `## No Team Members Found\n\nUse the team management commands to add team members to the database.`;
      }

      const teamMembersText = new TextDisplayBuilder().setContent(
        teamMembersContent
      );
      teamContainer.addTextDisplayComponents(teamMembersText);

      const teamSeparator = new SeparatorBuilder();
      teamContainer.addSeparatorComponents(teamSeparator);
      teamContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# type ${prefix}team to get more info about the team.`
        )
      );

      // ===== LINKS CONTAINER =====
      const linksContainer = new ContainerBuilder();
      linksContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${client.emoji.links} Important Links\n\n` +
            `Stay connected with ${client.user.username} and our community`
        )
      );
      linksContainer.addSeparatorComponents(new SeparatorBuilder());
      linksContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🏠 Community\n\n` +
            `**Support Server**\n` +
            `[Join Our Discord](${client.config.links.support})\n\n` +
            `*Get help, report bugs, and chat with other users*\n\n` +
            `**Invite Bot**\n` +
            `[Add ${client.user.username}](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)\n\n` +
            `*Bring ${client.user.username} to your server*`
        )
      );
      linksContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📚 Resources\n\n` +
            `**Official Website**\n` +
            `[phonix web](${client.config.links.website})\n\n` +
            `*Documentation, guides, and more*\n\n` +
            `**Hosting Provider**\n` +
            `[Artixcloud](${client.config.links.hosting})\n\n` +
            `*Reliable hosting services*`
        )
      );

      // ===== BUTTONS =====
      const homeButtons = new ActionRowBuilder().setComponents([
        new client.button().g("home", "Home", ``, true),
        new client.button().p("stats", "Statistics", ``),
        new client.button().d("team", "Team", ``),
        new client.button().s("links", "Links", ``),
      ]);
      const statsButtons = new ActionRowBuilder().setComponents([
        new client.button().g("home", "Home", ``),
        new client.button().p("stats", "Statistics", ``, true),
        new client.button().d("team", "Team", ``),
        new client.button().s("links", "Links", ``),
      ]);
      const teamButtons = new ActionRowBuilder().setComponents([
        new client.button().g("home", "Home", ``),
        new client.button().p("stats", "Statistics", ``),
        new client.button().d("team", "Team", ``, true),
        new client.button().s("links", "Links", ``),
      ]);
      const linksButtons = new ActionRowBuilder().setComponents([
        new client.button().g("home", "Home", ``),
        new client.button().p("stats", "Statistics", ``),
        new client.button().d("team", "Team", ``),
        new client.button().s("links", "Links", ``, true),
      ]);

      homeContainer.addActionRowComponents(homeButtons);
      statsContainer.addActionRowComponents(statsButtons);
      teamContainer.addActionRowComponents(teamButtons);
      linksContainer.addActionRowComponents(linksButtons);

      // ===== SEND MESSAGE =====
      const msg = await message.reply({
        components: [homeContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // ===== COLLECTOR =====
      const collector = msg.createMessageComponentCollector({
        filter: (i) => {
          if (message.author.id === i.user.id) return true;
          i.reply({
            content: `${client.emoji.cross} | That's not your session. Run: \`${prefix}stats\` to create your own.`,
            ephemeral: true,
          });
          return false;
        },
        time: 300000,
      });

      collector.on("collect", async (i) => {
        try {
          if (i.customId === "home") {
            await i.update({
              components: [homeContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } else if (i.customId === "stats") {
            await i.update({
              components: [statsContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } else if (i.customId === "team") {
            await i.update({
              components: [teamContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          } else if (i.customId === "links") {
            await i.update({
              components: [linksContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        } catch (err) {
          console.error("Error handling button interaction:", err);
        }
      });

      collector.on("end", async () => {
        try {
          if (msg.editable) {
            const disabledButtons = new ActionRowBuilder().setComponents([
              new client.button().g("home", "Home", ``, true),
              new client.button().p("stats", "Statistics", ``, true),
              new client.button().d("team", "Team", ``, true),
              new client.button().s("links", "Links", ``, true),
            ]);
            const expiredContainer = new ContainerBuilder();
            expiredContainer.addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# ⏰ Session Expired\n\n` +
                  `This interaction has expired. Run \`${prefix}stats\` again to create a new session.`
              )
            );
            expiredContainer.addActionRowComponents(disabledButtons);
            await msg.edit({
              components: [expiredContainer],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        } catch (err) {
          console.error("Error disabling buttons:", err);
        }
      });
    } catch (err) {
      console.error("Error executing stats command:", err);
      message.reply({
        content: `${client.emoji.cross} | An error occurred while executing this command.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
