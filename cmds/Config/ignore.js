const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const IgnoreChannelModel = require("@data/ignorechannel"); // Import your MongoDB model

module.exports = {
  name: "ignore",
  aliases: ["ig"],
  category: "Config",
  description: "Ignorechannel",
  usage: "<#channel>",
  userPerms: [],
  args: true,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    if (
      !message.member.permissions.has(
        PermissionsBitField.resolve("ManageChannels")
      )
    ) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | You must have \`Manage Channels\` permissions to use this command.`
          ),
        ],
      });
    }

    if (!args[0]) {
      const embed = new client.embed()
        .setThumbnail(client.user.displayAvatarURL())
        .setColor(client.color)
        .setDescription(
          ` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!\`\`\`\n\n**Aliases:**\n\`\`[ignore]\`\`\n**Usage:**\n\`\`add/remove/config/reset\`\``
        )
        .setFooter({
          text: `Req By ` + message.author.displayName,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        });
      return message.channel.send({ embeds: [embed] });
    }

    const option = args[0].toLowerCase();
    if (option === "add") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send({
          content: `Please provide a valid channel.`,
        });
      const data = await IgnoreChannelModel.findOne({
        guildId: message.guild.id,
        channelId: channel.id,
      });
      if (data)
        return message.channel.send({
          content: `This channel is already in the ignore channel list.`,
        });
      const newData = new IgnoreChannelModel({
        guildId: message.guild.id,
        channelId: channel.id,
      });
      await newData.save();
      return message.channel.send({
        content: `Successfully added ${channel} to the ignore channel list.`,
      });
    } else if (option === "remove") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send({
          content: `Please provide a valid channel.`,
        });
      const data = await IgnoreChannelModel.findOne({
        guildId: message.guild.id,
        channelId: channel.id,
      });
      if (!data)
        return message.channel.send({
          content: `This channel is not in the ignore channel list.`,
        });
      await data.deleteOne();
      return message.channel.send({
        content: `Successfully removed ${channel} from the ignore channel list.`,
      });
    } else if (option === "config") {
      const data = await IgnoreChannelModel.find({ guildId: message.guild.id });
      if (data.length === 0)
        return message.channel.send({
          content: `There are no channels in the ignore channel list.`,
        });
      const channels = data
        .map((d, i) => `> ${i + 1} <#${d.channelId}>`)
        .join("\n");
      const embed = new client.embed()
        .setColor(client.color)
        .setTitle("The following channels are in the ignore channel list:-")
        .setDescription(`${channels}`);
      return message.channel.send({ embeds: [embed] });
    } else if (option === "reset") {
      const data = await IgnoreChannelModel.find({ guildId: message.guild.id });
      if (data.length === 0)
        return message.channel.send({
          content: `There are no channels in the ignore channel list.`,
        });
      await IgnoreChannelModel.deleteMany({ guildId: message.guild.id });
      return message.channel.send({
        content: `Successfully cleared the ignore channel list.`,
      });
    }
  },
};
