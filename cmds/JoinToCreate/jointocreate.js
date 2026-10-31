const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  MessageFlags,
} = require("discord.js");
const VoiceConfig = require("@data/voiceConfig");

module.exports = {
  name: "jointocreate",
  aliases: ["j2c"],
  userPerms: ["Administrator"],
  category: "JoinToCreate",
  description: "Setup / Reset / View config for the Join to Create system",
  
  async execute(message, args, client) {
    const sub = args[0]?.toLowerCase();

    // If no args provided
    if (!sub) {
      const usage = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **Usage:**\n\`${client.prefix}setupvc <setup | reset | config>\``
        )
      );
      return message.reply({ components: [usage], flags: MessageFlags.IsComponentsV2 });
    }

    // Fetch config
    const existing = await VoiceConfig.findOne({ guildID: message.guild.id });

    // ───────────────────────────────
    // 🧱 SETUP
    // ───────────────────────────────
    if (sub === "setup") {
      if (existing)
        return message.reply({
          content: `${client.emoji.cross} You already have a Join-to-Create setup. Use \`${client.prefix}setupvc reset\` first.`,
        });

      const category = await message.guild.channels.create({
        name: "PHONIX TEMP VC",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages],
          },
        ],
      });

      const joinChannel = await message.guild.channels.create({
        name: "➕ Join to Create",
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
        ],
      });

      const controlChannel = await message.guild.channels.create({
        name: "vc-control",
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages],
          },
        ],
      });

      await VoiceConfig.findOneAndUpdate(
        { guildID: message.guild.id },
        {
          categoryID: category.id,
          channelID: joinChannel.id,
          textChannelID: controlChannel.id,
        },
        { upsert: true }
      );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `> **TempVoice Interface**\n- Press the buttons below to use the interface.`
          )
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems([
            {
              media: {
                url: `https://iili.io/fS0mFdg.png`,
              },
            },
          ])
        );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_rename").setEmoji(client.emoji.vcrename).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_limit").setEmoji(client.emoji.vcincrease).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_privacy").setEmoji(client.emoji.vcprivacy).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_kick").setEmoji(client.emoji.vckick).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_info").setEmoji(client.emoji.vcinfo).setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_waiting").setEmoji(client.emoji.vcwaiting).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_trust").setEmoji(client.emoji.vctrust).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_untrust").setEmoji(client.emoji.vcuntrust).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_invite").setEmoji(client.emoji.vcinvite).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_block").setEmoji(client.emoji.vcblock).setStyle(ButtonStyle.Secondary)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vc_unblock").setEmoji(client.emoji.vcunblock).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_claim").setEmoji(client.emoji.vcclaim).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_delete").setEmoji(client.emoji.delete).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_transfer").setEmoji(client.emoji.vctransfer).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("vc_region").setEmoji(client.emoji.vcregion).setStyle(ButtonStyle.Secondary)
      );

      container.addActionRowComponents(row1, row2, row3);
      await controlChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

      const success = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${client.emoji.tick} Voice control system has been set up successfully.`)
      );
      return message.reply({ components: [success], flags: MessageFlags.IsComponentsV2 });
    }

    // ───────────────────────────────
    // 🔁 RESET
    // ───────────────────────────────
    if (sub === "reset") {
      if (!existing)
        return message.reply({
          content: `${client.emoji.cross} No Join-to-Create system found to reset.`,
        });

      const { categoryID, channelID, textChannelID } = existing;
      const ids = [categoryID, channelID, textChannelID];

      for (const id of ids) {
        const ch = message.guild.channels.cache.get(id);
        if (ch) await ch.delete().catch(() => null);
      }

      await VoiceConfig.deleteOne({ guildID: message.guild.id });

      const done = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${client.emoji.tick} Join-to-Create system has been reset successfully.`)
      );
      return message.reply({ components: [done], flags: MessageFlags.IsComponentsV2 });
    }

    // ───────────────────────────────
    // ⚙️ CONFIG
    // ───────────────────────────────
    if (sub === "config") {
      if (!existing)
        return message.reply({
          content: `${client.emoji.cross} No configuration found. Run \`${client.prefix}setupvc setup\` first.`,
        });

      const { categoryID, channelID, textChannelID } = existing;
      const cat = message.guild.channels.cache.get(categoryID);
      const join = message.guild.channels.cache.get(channelID);
      const ctrl = message.guild.channels.cache.get(textChannelID);

      const info = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **Current Join-to-Create Configuration**\n\n` +
            `**Category:** ${cat ? cat.name : "Deleted"}\n` +
            `**Join Channel:** ${join ? join.name : "Deleted"}\n` +
            `**Control Channel:** ${ctrl ? ctrl.name : "Deleted"}`
        )
      );
      return message.reply({ components: [info], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
