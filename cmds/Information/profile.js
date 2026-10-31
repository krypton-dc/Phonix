const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
} = require("discord.js");
const Canvacard = require("canvacard");
const UserUsage = require("@data/topuser");
const Badge = require("@data/badge");
const axios = require("axios");
const VoteBypassUserModel = require("@data/votebypassuser");
const noprefix = require("@data/noprefix");
const Premium = require("@data/premium");
const Profile = require("@data/profile");
const B = {
  day: 1,
  week: 1,
  month: 3,
  year: 5,
  permanent: 5,
};

module.exports = {
  name: "profile",
  category: "Information",
  aliases: ["pr", "badges", "badge", "bdg"],
  description: "View your or someone else's profile.",
  botPerms: ["EmbedLinks"],
  cooldown: 3,
  execute: async (message, args, client, prefix, player, guildData) => {
    const ozuma = await client.users.cache.get(`${client.owner}`);
    const user = message.mentions.users.first() || message.author;
    const hope = message.guild.members.fetch(message.author.id);

    let bannerUrl = null;
    try {
      const { data } = await axios.get(
        `https://discord.com/api/users/${user.id}`,
        {
          headers: { Authorization: `Bot ${client.token}` },
        }
      );
      if (data.banner) {
        const ext = data.banner.startsWith("a_") ? ".gif" : ".png";
        bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${data.banner}${ext}?size=4096`;
      } else {
        bannerUrl =
          "https://cdn.discordapp.com/banners/1033496708992204840/ab50e5bfe369c1a669c67529589956a0.png?size=4096";
      }
    } catch (err) {
      console.error("Failed to fetch user banner:", err);
    }
    const rank = new Canvacard.Rank(message.author.id)
      .setAvatar(
        user.displayAvatarURL({ extension: "png", size: 512 }) || "",
        user.avatarDecoration?.asset
      )
      .setBanner(bannerUrl)
      .setBadges(user.flags?.bitfield, user.bot, true)
      .setStatus("dnd")
      .setProgressBar(["#14C49E", "#FF0000"], "GRADIENT", true)
      .setUsername(user.username, user.discriminator)
      .setCreatedTimestamp(user.createdTimestamp);
    const image = await rank.build();
    const attachment = new AttachmentBuilder(image, { name: "profile.png" });

    const cache = [];
    let data = await Badge.findOne({ userId: user.id });
    if (!data) data = await Badge.create({ userId: user.id });

    try {
      const guild = await client.guilds.fetch(client.config.links.guild);
      const sus = await guild.members.fetch(user.id);
    } catch (e) {
      const embed = new client.embed()
        .setAuthor({
          name: `Join My Support Server!`,
          iconURL: user.displayAvatarURL({ dynamic: true }),
          url: client.config.links.support,
        })
        .setColor(client.color);
      return message.channel.send({ embeds: [embed] });
    }

    const guild = await client.guilds.fetch(client.config.links.guild);
    const sus = await guild.members.fetch(user.id);
    const Botusers = sus.roles.cache.has(`1329059243348852757`);
      
    if (data.badge.dev) cache.push(`${client.emoji.dev} **Bot Developer**`);
    if (data.badge.web) cache.push(`${client.emoji.web} **Web Developer**`);
    if (data.badge.owner) cache.push(`${client.emoji.owner} **Owner**`);
    if (data.badge.admin) cache.push(`${client.emoji.admin} **Admin**`);
    if (data.badge.staff) cache.push(`${client.emoji.staff} **Staff**`);
    if (data.badge.partner) cache.push(`${client.emoji.partner} **Partner**`);
    if (data.badge.supporter)
      cache.push(`${client.emoji.supporter} **Bot's Early Supporter**`);
    if (data.badge.sponsor) cache.push(`${client.emoji.sponsor} **Sponsor**`);
    if (data.badge.ownerspecial)
      cache.push(`${client.emoji.ownerspecial} **Owner's Special**`);
    if (data.badge.specialone)
      cache.push(`${client.emoji.specialone} **Special One's**`);
    if (data.badge.loveone)
      cache.push(`${client.emoji.loveone} **Love One's**`);
    if (data.badge.vip) cache.push(`${client.emoji.vip} **Vip**`);
    if (data.badge.friend) cache.push(`${client.emoji.friend} **Friend**`);
    if (data.badge.bug) cache.push(`${client.emoji.bug} **Bug Hunter**`);
    if (Botusers) cache.push(`${client.emoji.fam} **Users**`);

    if (cache.length === 0)
      cache.push(`Oops! **${user.username}** doesn't have any badges.`);

    const voteBypassUser = await VoteBypassUserModel.findOne({
      userId: user.id,
    });
    const noprefixData = await noprefix.findOne({ userId: user.id });
    const userProfile = await Profile.findOne({ User: user.id });
    const premiumData = await Premium.findOne({ userId: message.author.id });

    let primeBadge = "";
    let aboutBio = "";
    let premiumStatus = "";

    if (voteBypassUser)
      primeBadge += `**VotebyPass** - <a:enable:1460749966183108759>\n`;
    if (!voteBypassUser)
      primeBadge += `**VotebyPass** - <a:disabled1:1460749999489945600>\n`;

    if (userProfile?.Bio) aboutBio += `${userProfile.Bio}`;
    if (!userProfile?.Bio) aboutBio += `__None__`;

    if (noprefixData)
      primeBadge += `**NoPrefix** - <a:enable:1460749966183108759>\n`;
    if (!noprefixData)
      primeBadge += `**NoPrefix** - <a:disabled1:1460749999489945600>\n`;

    if (premiumData && premiumData.premium) {
      const expires = premiumData.expiresAt
        ? `<t:${Math.floor(premiumData.expiresAt.getTime() / 1000)}:R>`
        : "Never";
      const boostsLeft =
        premiumData.tier === "permanent" || !premiumData.expiresAt
          ? "Unlimited"
          : premiumData.tier &&
            (B[premiumData.tier] - premiumData.boostsUsed || 0);
      premiumStatus +=
        `**Premium Tier:** ${premiumData.tier}\n` +
        `**Expires:** ${expires}\n` +
        `**Boosts Used:** ${premiumData.boostsUsed}\n` +
        `**Boosts Left:** ${boostsLeft}`;
    }
    if (!premiumData) premiumStatus += "No premium active.";

    // Social Media Links
    const socialMedia = userProfile?.SocialMedia || {};
    const twitter =
      socialMedia.twitter &&
      socialMedia.twitter.username &&
      socialMedia.twitter.link
        ? `__${client.emoji.twitter}: [${socialMedia.twitter.username}](${socialMedia.twitter.link})__`
        : null;
    const instagram =
      socialMedia.instagram &&
      socialMedia.instagram.username &&
      socialMedia.instagram.link
        ? `__${client.emoji.insta} [${socialMedia.instagram.username}](${socialMedia.instagram.link})__`
        : null;
    const discord =
      socialMedia.discord &&
      socialMedia.discord.username &&
      socialMedia.discord.link
        ? `__${client.emoji.discord} [${socialMedia.discord.username}](${socialMedia.discord.link})__`
        : null;

    // Collect social media links if they exist
    const socialLinks = [twitter, instagram, discord].filter(
      (link) => link !== null
    ); // Filters out null values

    const socialMediaField =
      socialLinks.length > 0
        ? socialLinks.join("\n")
        : "No social media links set.";

    const container = new ContainerBuilder();
    const sep = new SeparatorBuilder();

    const imagee = await `attachment://profile.png`;
    const media1 = new MediaGalleryBuilder().addItems([
      {
        media: {
          url: imagee,
        },
      },
    ]);

    const media2 = new MediaGalleryBuilder().addItems([
      {
        media: {
          url: client.config.links.icon,
        },
      },
    ]);

    container.addMediaGalleryComponents(media1);
    const text1 = new TextDisplayBuilder().setContent(`${cache.join("\n")}`);
    container.addTextDisplayComponents(text1);
    container.addSeparatorComponents(sep);
    const text2 = new TextDisplayBuilder().setContent(`${primeBadge}`);
    container.addTextDisplayComponents(text2);
    container.addSeparatorComponents(sep);

    const text3 = new TextDisplayBuilder().setContent(`${socialMediaField}`);
    container.addTextDisplayComponents(text3);
    container.addSeparatorComponents(sep);

    const text4 = new TextDisplayBuilder().setContent(premiumStatus);
    container.addTextDisplayComponents(text4);
    container.addSeparatorComponents(sep);

    const text5 = new TextDisplayBuilder().setContent(`${aboutBio}`);
    container.addTextDisplayComponents(text5);
    container.addSeparatorComponents(sep);

    container.addMediaGalleryComponents(media2);

    const msg = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      files: [attachment],
    });
  },
};
