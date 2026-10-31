const { getSettings } = require("../data/welcomesystem");

module.exports = class Util {
  constructor(client) {
    this.client = client;
  }

      user(query) {
    let userId = null;
    if (query) {
      let matches = query.match(/^<@!?(\d+)>$/);
      if (matches) {
        userId = matches[1];
      }
      if (userId === null) {
        if (!isNaN(query)) {
          userId = query;
        }
      }
    }
    return userId;
  }
  emojify(content) {
    return content
      .toLowerCase()
      .split("")
      .map((letter) => this.client.emoji[letter] || letter)
      .join("");
  }

  async sendPreview(settings, member) {
    if (!settings.welcome?.enabled)
      return "Welcome message not enabled in this server";

    const targetChannel = member.guild.channels.cache.get(
      settings.welcome.channel
    );
    if (!targetChannel)
      return "No channel is configured to send welcome messages";

    const response = await this.buildGreeting(
      member,
      "WELCOME",
      settings.welcome
    );
    const time = settings.welcome.autodel;

    await this.sendMessage(targetChannel, response, time);
    return `Sent welcome preview to ${targetChannel.toString()}`;
  }

  async setStatus(settings, status) {
    const enabled = status.toUpperCase() === "ON";
    settings.welcome.enabled = enabled;
    await settings.save();
    return `Configuration saved! Welcome message ${enabled ? "**enabled**" : "**disabled**"}`;
  }

  async setChannel(settings, channel) {
    if (!this.canSendEmbeds(channel)) {
      return (
        "I cannot send messages to that channel. I need the `Send Messages` and `Embed Links` permissions in " +
        channel.toString()
      );
    }
    settings.welcome.channel = channel.id;
    await settings.save();
    return `Configuration saved! Welcome message will be sent to ${channel.toString()}`;
  }

  async setDescription(settings, desc) {
    settings.welcome.embed.description = desc;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setFooter(settings, footer) {
    settings.welcome.embed.footer = footer;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setTitle(settings, title) {
    settings.welcome.embed.title = title;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setImage(settings, image) {
    settings.welcome.embed.image = image;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setThumbnail(settings, thumbnail) {
    settings.welcome.embed.thumbnail = thumbnail;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  canSendEmbeds(channel) {
    return channel
      .permissionsFor(channel.guild.members.me)
      .has(["SendMessages", "EmbedLinks"]);
  }

  async buildGreeting(member, type, config) {
    if (!config) return;

    const content = config.content
      ? await this.parse(config.content, member)
      : `<@${member.user.id}>`;

    const embed = new this.client.embed()
      .setAuthor({ name: member.user.tag, iconURL: member.displayAvatarURL() })
      .setTimestamp()
      .setColor(config.embed.color || this.client.color);

    if (config.embed.description) {
      embed.setDescription(await this.parse(config.embed.description, member));
    }

    // Handle thumbnail
    if (config.embed.thumbnail && config.embed.thumbnail !== "false") {
      const thumbnailURL = await this.parseDynamicURL(
        config.embed.thumbnail,
        member
      );
      if (this.isValidURL(thumbnailURL)) {
        embed.setThumbnail(thumbnailURL);
      }
    }

    // Handle title
    if (config.embed.title) {
      embed.setTitle(await this.parse(config.embed.title, member));
    }

    // Handle image
    if (config.embed.image && config.embed.image !== "false") {
      const imageURL = await this.parseDynamicURL(config.embed.image, member);
      if (this.isValidURL(imageURL)) {
        embed.setImage(imageURL);
      }
    }

    // Handle footer
    if (config.embed.footer) {
      embed.setFooter(await this.parse(config.embed.footer, member));
    }

    if (!config.content && !config.embed.description && !config.embed.footer) {
      return {
        content: `<@${member.user.id}>`,
        embeds: [
          new this.client.embed()
            .setColor(this.client.color)
            .setTitle(`゛𓂃﹒welcome !! `)
            .setDescription(
              `- Kindly Check RuleZ\n` +
                `- Boost if you love the guild\n` +
                `<a:fh_blue_butterfly:1319220118743552061> . ⩩ . __Thanks For Joining__ <a:fh_blue_butterfly:1319220118743552061>`
            )
            .setFooter({
              text: `Fam: ` + member.guild.memberCount,
              iconURL: member.guild.iconURL(),
            }),
        ],
      };
    }

    return { content, embeds: [embed] };
  }

  async sendMessage(channel, content, seconds) {
    if (!channel || !content) return;

    const perms = ["ViewChannel", "SendMessages"];
    if (content.embeds?.length > 0) perms.push("EmbedLinks");

    if (!channel.permissionsFor(channel.guild.members.me).has(perms)) return;

    try {
      const message = await channel.send(content);
      if (seconds && seconds > 0) {
        setTimeout(() => {
          if (message.deletable) message.delete().catch(() => {});
        }, seconds * 1000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  async sendWelcome(member, settings) {
    const config = (await getSettings(member.guild))?.welcome;
    if (!config || !config.enabled) return;

    const channel = member.guild.channels.cache.get(config.channel);
    if (!channel) return;

    const response = await this.buildGreeting(member, "WELCOME", config);
    this.sendMessage(channel, response, config.autodel);
  }

  isHex(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  async parse(content, member) {
    const mention = `<@${member.user.id}>`;
    return content
      .replaceAll(/\\n/g, "\n")
      .replaceAll(/{server_name}/g, member.guild.name)
      .replaceAll(/{server_id}/g, member.guild.id)
      .replaceAll(/{server_icon}/g, member.guild.iconURL({ dynamic: true }))
      .replaceAll(/{server_ownerId}/g, member.guild.ownerId)
      .replaceAll(/{server_owner}/g, `<@${member.guild.ownerId}>`)
      .replaceAll(/{server_memberCount}/g, member.guild.memberCount)
      .replaceAll(/{user_display}/g, member.displayName)
      .replaceAll(
        /{user_avatar}/g,
        member.user.displayAvatarURL({ dynamic: true })
      )
      .replaceAll(/{user_name}/g, member.user.username)
      .replaceAll(/{user}/g, mention)
      .replaceAll(/{user_id}/g, member.user.id)
      .replaceAll(
        /{user_created:at}/g,
        `<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`
      );
  }

  async parseDynamicURL(url, member) {
    return url
      .replaceAll(/{server_icon}/g, member.guild.iconURL({ dynamic: true }))
      .replaceAll(
        /{user_icon}/g,
        member.user.displayAvatarURL({ dynamic: true })
      );
  }

  isValidURL(url) {
    try {
      return Boolean(new URL(url));
    } catch (error) {
      return false;
    }
  }

  async purgeMessages(issuer, channel, type, amount, argument, commandMessage) {
    const perms = ["ManageMessages", "ReadMessageHistory"];
    if (!channel.permissionsFor(issuer)?.has(perms)) return "MemberPerm";
    if (!channel.permissionsFor(channel.guild.members.me)?.has(perms))
      return "BotPerms";

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const filtered = [...messages.values()].filter((msg) => {
        if (msg.id === commandMessage.id) return false;

        switch (type) {
          case "ALL":
            return true;
          case "BOT":
            return msg.author.bot;
          case "EMBED":
            return msg.embeds?.length > 0;
          case "EMOJI":
            return /<a?:\w+:\d+>/.test(msg.content);
          case "FILE":
            return msg.attachments.size > 0;
          case "IMAGE":
            return [...msg.attachments.values()].some((a) =>
              a.contentType?.startsWith("image/")
            );
          case "LINK":
            return /https?:\/\/|discord\.gg\//i.test(msg.content);
          case "MENTION":
            return msg.mentions.users.size > 0 || msg.mentions.roles.size > 0;
          case "REACTION":
            return msg.reactions.cache.size > 0;
          default:
            return false;
        }
      });

      const toDelete = filtered.slice(0, amount);
      if (toDelete.length === 0) return "NO_MESSAGES";

      await channel.bulkDelete(toDelete, true);
      return toDelete.length;
    } catch (err) {
      console.error("[purgeMessages ERROR]:", err);
      return "ERROR";
    }
  }
};
