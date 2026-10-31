const { PermissionsBitField, MessageFlags } = require("discord.js");

module.exports = {
  name: "join",
  aliases: ["j"],
  category: "Music",
  cooldown: 5,
  description: "Joins the voice channel you are in.",
  args: false,
  usage: "Joining a voice channel",
  userPrams: [],
  botPrams: ["EmbedLinks", "Connect", "Speak"],
  inVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const { channel } = message.member.voice;
    const player = client.manager.players.get(message.guild.id);
    if (player) {
      const x = client.box().text(
            `${client.emoji.cross} | I'm already connected to <#${player.voiceId}> voice channel!`
          )  
       await message.channel.send({
       components: [x], flags: MessageFlags.IsComponentsV2
      });
    }

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve(["Speak", "Connect"])
      )
    ) {
        const x = client.box()
            .text(
              `${client.emoji.cross} | I don't have enough permissions connect your vc please give me permission \`CONNECT\` or \`SPEAK\`.`
            )
      return message.channel.send({ components: [x], flags: MessageFlags.IsComponentsV2
      });
    }

    await client.manager.createPlayer({
      guildId: message.guild.id,
      voiceId: message.member.voice.channel.id,
      textId: message.channel.id,
      shardId: message.guild.shardId,
      volume: 80,
      deaf: true,
    });
    const bot = client
      .box()
      .text(`# ${client.emoji.tick} Joined ${channel.name}`)
      .sep()
      .text(`Bond With <#${message.channelId}>`);
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [bot],
    });
  },
};
