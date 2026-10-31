const { PermissionsBitField, WebhookClient, version } = require("discord.js");
const db = require("@data/prefix.js");
const bl = require("@data/blacklist");
const IgnoreChannelModel = require("@data/ignorechannel");
const Premium = require("@data/premium");
const VoteBypassUserModel = require("@data/votebypassuser");
const db4 = require("@data/noprefix");
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot) return;

    if (message.content.trim().toLowerCase().startsWith("jsk")) {
      const o = message.content.slice(3).trim();
      message.content = `?jsk ${o}`;
      return client.Jsk.run(message);
    }
    if (message.content.trim().toLowerCase().startsWith("jsk ")) {
      message.content = message.content.replace(/^jsk /i, "?jsk ");
      return client.Jsk.run(message);
    }

    let prefix = client.prefix;
    const ress = await db.findOne({ Guild: message.guildId });
    if (ress && ress.Prefix) prefix = ress.Prefix;
    const reacter = new RegExp(`^<@!?${client.owner}>( |)$`);

    if (message.content.includes(client.owner)) {
      await message.react(client.emoji.owner).catch(() => {});
    }

    const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (message.content.match(mention)) {
      return await client.emit("Tag", message, client);
    }

    const np = [];
    const npData = await db4.findOne({
      userId: message.author.id,
      noprefix: true,
    });
    if (npData) np.push(message.author.id);

    const regex = new RegExp(`^<@!?${client.user.id}>`);
    const pre = message.content.match(regex)
      ? message.content.match(regex)[0]
      : prefix;
    if (!np.includes(message.author.id)) {
      if (!message.content.startsWith(pre)) return;
    }

    const args =
      np.includes(message.author.id) === false
        ? message.content.slice(pre.length).trim().split(/ +/)
        : message.content.startsWith(pre) === true
          ? message.content.slice(pre.length).trim().split(/ +/)
          : message.content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command =
      client.commands.get(commandName) ||
      client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName)
      );

    if (!command) return;

    const blusers = await bl.findOne({ userId: message.author.id });
    if (blusers) {
      const embed = new client.embed().a(
        `You have been blacklisted from using the bot!`,
        message.author.displayAvatarURL()
      );
      const m = await message.channel
        .send({ embeds: [embed] })
        .catch(() => null);
      setTimeout(() => m.delete().catch(() => null), 5000);
      return;
    }

    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = Math.round(expirationTime / 1_000);
        const cooldownEmbed = new client.embed().d(
          `Please wait **<t:${timeLeft}:R>** before reusing the \`${command.name}\` command.`
        );
        return message.reply({ embeds: [cooldownEmbed] }).then((msg) => {
          const delayTime = expirationTime - now;
          setTimeout(() => {
            msg.delete();
          }, delayTime);
        });
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    const s = await Premium.findOne({ userId: message.author.id });

    if (command.prm && !s) {
      const embed = new client.embed().d(
        `You need to be a premium user to use this command!`
      );
      return await message.channel.send({ embeds: [embed] });
    }

    const voteBypassUser = await VoteBypassUserModel.findOne({
      userId: message.author.id,
    });

    if (command.vote && !voteBypassUser) {
      const voted = await client.topgg.hasVoted(message.author.id);
      if (!voted) {
        const voteEmbed = new client.embed().d(
          `You need to vote for the bot to use this command!`
        );
        return message.reply({ embeds: [voteEmbed] });
      }
    }

    const ICHchannelId = message.channel.id;
    const isIgnored = await IgnoreChannelModel.findOne({
      guildId: message.guild.id,
      channelId: ICHchannelId,
    });
    if (isIgnored) {
      const baap = new client.embed().d(
        `You cannot use commands in this channel`
      );
      const ignoreMessage = await message.channel
        .send({ embeds: [baap] })
        .catch(() => null);
      setTimeout(() => {
        ignoreMessage.delete().catch(console.error);
      }, 3000);
      return;
    }

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("SendMessages")
      )
    )
      return await message.author
        .send({
          content: `I don't have **\`SEND_MESSAGES\`** permission in ${message.guild.name} to execute this **\`${command.name}\`** command.`,
        })
        .catch(() => {});

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("ViewChannel")
      )
    )
      return;

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("EmbedLinks")
      )
    )
      return await message.author
        .send({
          content: `I don't have **\`EmbedLinks\`** permission in ${message.guild.name} to execute this **\`${command.name}\`** command.`,
        })
        .catch(() => {});

    if (args[0]?.toLowerCase() == "?h")
      return await client.emit("InfoReq", message, command);

    if (command.args && !args.length) {
      let reply = `\`\`\`diff\n+ [] = optional argument\n+ <> = required argument\n+ Do NOT type these when using commands!\`\`\``;

      if (command.description) {
        reply += `\n${command.description}`;
      }
      if (command.aliases) {
        reply += `\n**Aliases**\n\`${command.aliases.join(", ")}\``;
      }
      if (command.usage) {
        reply += `\n**Usage**\n\`${prefix}${command.name} ${command.usage}\``;
      }

      const embed = new client.embed();
      embed.setAuthor({
        name: `| Missing Arguments`,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      });
      embed.setTimestamp();
      embed.d(reply);
      return message.channel.send({ embeds: [embed] });
    }

    if (command.botPerms) {
      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve(command.botPerms || [])
        )
      ) {
        const embed = new client.embed().setDescription(
          `I don't have **\`${command.botPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`
        );
        return message.channel.send({ embeds: [embed] }).catch(() => null);
      }
    }
    if (command.userPerms) {
      if (
        !message.member.permissions.has(
          PermissionsBitField.resolve(command.userPerms || [])
        )
      ) {
        const embed = new client.embed()
          .setColor(client.color)
          .setDescription(
            `You don't have **\`${command.userPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`
          );
        return message.channel.send({ embeds: [embed] }).catch(() => null);
      }
    }

    if (command.owner && message.author.id !== `${client.owner}`) {
      const owner = await client.users.fetch(client.owner);
      const embed = new client.embed().setAuthor({
        name: `| Only ${owner.displayName} can use this cmds!`,
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send({ embeds: [embed] }).catch(() => null);
    }

    const player = client.manager.players.get(message.guild.id);
    if (command.player && !player) {
      return message.channel
        .send({
          embeds: [new client.embed().d(`Im Not In Any Voice Channel!`)],
        })
        .catch(() => null);
    }
    if (command.inVoiceChannel && !message.member.voice.channelId) {
      const embed = new client.embed().d(
        `You must be connected to a voiceChannel`
      );
      return message.channel.send({ embeds: [embed] }).catch(() => null);
    }

    if (command.sameVoiceChannel) {
      if (message.guild.members.me.voice.channel) {
        if (
          message.guild.members.me.voice.channelId !==
          message.member.voice.channelId
        ) {
          const embed = new client.embed().d(
            `You are not connected to the same voiceChannel`
          );
          return message.channel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }

    command.execute(message, args, client, prefix).catch((e) => {
      console.log(e);
    });
    if (command && command.execute) {
      const web = new WebhookClient({
        url: client.config.Webhooks.cmdrun,
      });
      const op = new client.embed()
        .t(`Command Executed`)
        .d(`[${message.guild.name}](${client.support})`)
        .thumb(message.guild.iconURL())
        .f(`Command Log • Powered by Phonix`, client.user.displayAvatarURL())
        .addFields(
          {
            name: "Channel",
            value: `${message.channel.name} (\`${message.channel.id}\`)`,
            inline: true,
          },
          {
            name: "Command",
            value: `\`${command.name}\``,
            inline: true,
          },
          {
            name: "User",
            value: `${message.author.tag} (\`${message.author.id}\`)`,
            inline: true,
          }
        );
      web.send({ embeds: [op] });
    }
  },
};
