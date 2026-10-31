const { MessageFlags } = require("discord.js");

module.exports = {
  name: "autoplay",
  aliases: ["ap"],
  category: "Music",
  cooldown: 3,
  description: "Toggle music autoplay",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],

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
    const autoplay = player.data.get("autoplay");
    const song = player.queue.current;

    if (autoplay) {
      player.data.set("autoplay", false);
      const thing = new client.embed().setAuthor({
        name: "Autoplay is now disabled",
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send({ embeds: [thing] });
    } else {
      const identifier = player.queue.current.identifier;
      player.data.set("autoplay", true);
      player.data.set("requester", client.user);
      player.data.set("identifier", identifier);
      const thing = new client.embed().setAuthor({
        name: "Autoplay is now enabled",
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send({ embeds: [thing] });
    }
  },
};
