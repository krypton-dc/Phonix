const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const VoiceConfig = require("@data/voiceConfig");

module.exports = {
  name: "createinterface",
  aliases: [],
  category: "JoinToCreate",
  description: "Regenerate the Voice Control Panel in the current channel (if panel was deleted)",
  execute: async (message, args, client, prefix) => {
    if (message.channel.type !== ChannelType.GuildText) {
      return message.reply(`${client.emoji.warn} This command can only be used in text channels.`);
    }

    let config = await VoiceConfig.findOne({ guildID: message.guild.id });
    if (!config) {
      return message.reply(`${client.emoji.warn} No Join to Create configuration found. Use \`${prefix}setupvc\` first.`);
    }
    config.textChannelID = message.channel.id;
    await config.save();

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
`> **TempVoice Interface**
- Press the buttons below to use the interface.`
        )
      )
    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems([
      {
        media: {
          url: `https://iili.io/fS0mFdg.png`,
        },
      },
    ]));
      
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

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await message.reply({
      content: `${client.emoji.tick} Voice Control Panel has been recreated **here**. This channel is now set as the control panel.`,
      allowedMentions: { repliedUser: false },
    });
  },
};
