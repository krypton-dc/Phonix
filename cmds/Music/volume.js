const { MessageFlags } = require("discord.js");
const Wait = require("util").promisify(setTimeout);

module.exports = {
  name: "volume",
  aliases: ["v", "vol"],
  category: "Music",
  cooldown: 3,
  description: "Change volume of currently playing music",
  args: false,
  usage: "volume%",
  botPerms: ["EmbedLinks"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const me = client
        .box()
        .text(`Im Not Playing Any Song!`)
        .sep()
        .text(`Use \`${prefix}play\` to play a song!`);
      return message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [me],
      });
    }

    if (!args.length) {
      const x = client.box()
        .text(
          `${client.emoji.tick} | Player Current Volume: **${player.volume}%**`
        )
      .sep();
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }

    const volume = Number(args[0]);

    if (!volume || volume < 0 || volume > 1000) {
      const x = client.box()
        .text(
          `${client.emoji.cross} | Usage: **${prefix}volume** <Number of volume between 0 - 100>`
        );
      return message.reply({  components: [x], flags: MessageFlags.IsComponentsV2 });
    }

    await player.setVolume(volume / 1);
    Wait(500);
    if (volume > player.volume) {
      const x = client.box()
        .text(`Volume set to: **${volume}%**`)
        .sep();
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    } else if (volume < player.volume) {
      const x = client.box()
      .text(`Volume set to: **${volume}%**`);
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    } else {
      const x = client.box()
      .text(`Volume set to: **${volume}%**`);
      return message.reply({ components: [x], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
