const {
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { convertTime } = require("@utils/convert.js");

module.exports = {
  name: "grab",
  aliases: ["save"],
  category: "Music",
  cooldown: 3,
  description: "Saves the song that is currently playing and sends details to your DMs.",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.getP(message.guild.id);

    if (!player?.queue.current) {
      const notPlaying = new client.embed()
        .setDescription("🚫 I'm not playing any song!\nUse `" + prefix + "play <song>` to start music.");
      return message.reply({ embeds: [notPlaying] });
    }

    const song = player.queue.current;
    const total = song.length;
    const current = player.position;

    const notifyEmbed = new client.embed()
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription("I've sent you the song details in **DMs**!")
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();

    const profileButton = new ButtonBuilder()
      .setLabel("Check Your DMs")
      .setStyle(ButtonStyle.Link)
      .setURL(client.url(message.author.id));

    await message.reply({
      embeds: [notifyEmbed],
      components: [new ActionRowBuilder().addComponents(profileButton)],
    });

    const songEmbed = new client.embed()
      .t("🎶 Song Saved")
      .thumb(song.thumbnail)
      .d(
        `> **Song:** [${song.title}](${song.uri})\n` +
        `> **Duration:** \`${convertTime(song.duration)}\`\n` +
        `> **Requested By:** <@${song.requester.id}>\n` +
        `> **Saved By:** <@${message.author.id}>`
      )
      .addFields([
        {
          name: "Progress",
          value: `\`${convertTime(current)} / ${convertTime(total)}\``,
          inline: false,
        },
      ])
      .f(message.guild.name,message.guild.iconURL())

    const urlButton = new ButtonBuilder()
      .setLabel("Listen")
      .setStyle(ButtonStyle.Link)
      .setURL(song.uri);
    await message.author
      .send({ embeds: [songEmbed], components: [new ActionRowBuilder().addComponents(urlButton)] })
      .catch(() => {
        const failEmbed = new client.embed()
          .setColor("Red")
          .setDescription("⚠️ I couldn't send you a DM. Please check your privacy settings.");
        message.reply({ embeds: [failEmbed] });
      });
  },
};
