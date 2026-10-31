const {

  EmbedBuilder,

  MessageFlags,

  ActionRowBuilder,

  ButtonBuilder,

  ButtonStyle,

  RoleSelectMenuBuilder,

  PermissionsBitField,

} = require("discord.js");

const VoiceRole = require("@data/voicerole");

/* 🔒 Dangerous permissions list */

const DANGEROUS_PERMS = [

  PermissionsBitField.Flags.Administrator,

  PermissionsBitField.Flags.ManageGuild,

  PermissionsBitField.Flags.ManageRoles,

  PermissionsBitField.Flags.ManageChannels,

  PermissionsBitField.Flags.BanMembers,

  PermissionsBitField.Flags.KickMembers,

  PermissionsBitField.Flags.ModerateMembers,

  PermissionsBitField.Flags.ManageWebhooks,

];

/* 🔐 Role validation */

function isDangerousRole(role) {

  if (!role) return true;

  if (role.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  return DANGEROUS_PERMS.some((perm) => role.permissions.has(perm));

}

module.exports = {

  name: "invcrole",

  category: "Role",

  aliases: ["vcr"],

  description:

    "Configure roles to assign/remove when users join/leave voice channels.",

  botPerms: ["ManageRoles"],

  userPerms: ["Administrator"],

  cooldown: 3,

  execute: async (message, args, client) => {

    const menuEmbed = new EmbedBuilder()

      .setColor(client.color || "#5865F2")

      .setAuthor({

        name: "Voice Role Configuration",

        iconURL:

          message.guild.iconURL({ dynamic: true }) ||

          client.user.displayAvatarURL(),

      })

      .setDescription(

        "**Options**\n" +

          "• Configure Human Role\n" +

          "• Configure Bot Role\n" +

          "• View Current Settings\n" +

          "• Reset All Settings"

      )

      .setFooter({

        text: "Voice Role Manager",

        iconURL: client.user.displayAvatarURL(),

      })

      .setTimestamp();

    const mainRow = new ActionRowBuilder().addComponents(

      new ButtonBuilder()

        .setCustomId("set_human_role")

        .setLabel("Human Role")

        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()

        .setCustomId("set_bot_role")

        .setLabel("Bot Role")

        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()

        .setCustomId("view_config")

        .setLabel("View Config")

        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()

        .setCustomId("reset_config")

        .setLabel("Reset")

        .setStyle(ButtonStyle.Danger)

    );

    const sentMessage = await message.reply({

      embeds: [menuEmbed],

      components: [mainRow],

    });

    const collector = sentMessage.createMessageComponentCollector({

      time: 120000,

    });

    collector.on("collect", async (interaction) => {

      if (interaction.user.id !== message.author.id) {

        return interaction.reply({

          content: "This menu is not for you.",

          flags: MessageFlags.Ephemeral,

        });

      }

      const guildId = message.guild.id;

      /* ---------------- HUMAN ROLE ---------------- */

      if (interaction.customId === "set_human_role") {

        const select = new RoleSelectMenuBuilder()

          .setCustomId("human_role_select")

          .setPlaceholder("Select a SAFE role for humans")

          .setMinValues(1)

          .setMaxValues(1);

        return interaction.update({

          content: "Select a **non-admin & non-dangerous** role.",

          components: [new ActionRowBuilder().addComponents(select)],

          embeds: [],

        });

      }

      if (interaction.customId === "human_role_select") {

        const roleId = interaction.values[0];

        const role = interaction.guild.roles.cache.get(roleId);

        if (isDangerousRole(role)) {

          return interaction.reply({

            embeds: [

              new EmbedBuilder()

                .setColor("Red")

                .setDescription(

                  "❌ **Admin / Dangerous permission roles are not allowed** as VC roles."

                ),

            ],

            flags: MessageFlags.Ephemeral,

          });

        }

        if (

          role.position >=

          interaction.guild.members.me.roles.highest.position

        ) {

          return interaction.reply({

            content: "❌ I cannot manage this role due to role hierarchy.",

            flags: MessageFlags.Ephemeral,

          });

        }

        const voiceRole =

          (await VoiceRole.findOne({ guildId })) ||

          new VoiceRole({ guildId });

        voiceRole.humanRole = roleId;

        await voiceRole.save();

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor("Green")

              .setDescription(`✅ Human VC role set to <@&${roleId}>`),

          ],

          components: [],

        });

      }

      /* ---------------- BOT ROLE ---------------- */

      if (interaction.customId === "set_bot_role") {

        const select = new RoleSelectMenuBuilder()

          .setCustomId("bot_role_select")

          .setPlaceholder("Select a SAFE role for bots")

          .setMinValues(1)

          .setMaxValues(1);

        return interaction.update({

          content: "Select a **non-admin & non-dangerous** role.",

          components: [new ActionRowBuilder().addComponents(select)],

          embeds: [],

        });

      }

      if (interaction.customId === "bot_role_select") {

        const roleId = interaction.values[0];

        const role = interaction.guild.roles.cache.get(roleId);

        if (isDangerousRole(role)) {

          return interaction.reply({

            embeds: [

              new EmbedBuilder()

                .setColor("Red")

                .setDescription(

                  "❌ Bot VC roles cannot have admin or moderation permissions."

                ),

            ],

            flags: MessageFlags.Ephemeral,

          });

        }

        if (

          role.position >=

          interaction.guild.members.me.roles.highest.position

        ) {

          return interaction.reply({

            content: "❌ I cannot manage this role due to role hierarchy.",

            flags: MessageFlags.Ephemeral,

          });

        }

        const voiceRole =

          (await VoiceRole.findOne({ guildId })) ||

          new VoiceRole({ guildId });

        voiceRole.botRole = roleId;

        await voiceRole.save();

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor("Blue")

              .setDescription(`✅ Bot VC role set to <@&${roleId}>`),

          ],

          components: [],

        });

      }

      /* ---------------- VIEW CONFIG ---------------- */

      if (interaction.customId === "view_config") {

        const voiceRole = await VoiceRole.findOne({ guildId });

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor("#5865F2")

              .setTitle("Current Voice Role Settings")

              .setDescription(

                `**Human Role:** ${

                  voiceRole?.humanRole

                    ? `<@&${voiceRole.humanRole}>`

                    : "Not Set"

                }\n` +

                  `**Bot Role:** ${

                    voiceRole?.botRole

                      ? `<@&${voiceRole.botRole}>`

                      : "Not Set"

                  }`

              ),

          ],

          components: [],

        });

      }

      /* ---------------- RESET ---------------- */

      if (interaction.customId === "reset_config") {

        await VoiceRole.findOneAndDelete({ guildId });

        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor("Red")

              .setDescription("✅ All voice role settings have been reset."),

          ],

          components: [],

        });

      }

    });

    collector.on("end", () =>

      sentMessage.edit({ components: [] }).catch(() => {})

    );

  },

};