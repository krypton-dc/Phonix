const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
} = require("discord.js");

module.exports = {
  name: "role",
  aliases: ["addrole", "removerole"],
  cooldown: 5,
  description: "Manage roles for users - add, remove, or assign to groups",
  category: "Moderation",
  usage:
    "role add @user Member\nrole remove @user Member\nrole humans Member\nrole bots Member\nrole all Member",
  userPerms: ["ManageRoles"],
  botPerms: ["ManageRoles"],
  execute: async (message, args, client, prefix) => {
    if (!args[0]) {
      return message.reply({
        embeds: [
          new client.embed().setDescription(
            `${client.emoji.cross} | Please provide an action: \`add\`, \`remove\`, \`all\`, \`humans\`, or \`bots\``
          ),
        ],
      });
    }

    const action = args[0].toLowerCase();

    // Handle group operations (all, humans, bots)
    if (["all", "humans", "bots"].includes(action)) {
      let role = await findMatchingRoles(message.guild, args.slice(1).join(" "));
      role = role[0];

      if (!role) {
        return message.reply({
          embeds: [
            new client.embed().setAuthor({
              name: "Can You Please Provide Me A Role!",
              iconURL: message.author.displayAvatarURL(),
            }),
          ],
        });
      }
      if (!checkRoleHierarchy(message, role, client)) return;

      await handleGroupRole(message, role, action, client);
      return;
    }
    if (["add", "remove"].includes(action)) {
      if (!args[1]) {
        return message.reply({
          embeds: [
            new client.embed().setAuthor({
              name: "Can You Please Mention A User!",
              iconURL: message.author.displayAvatarURL(),
            }),
          ],
        });
      }

      const user =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]);

      if (!user) {
        return message.reply({
          embeds: [
            new client.embed().setAuthor({
              name: "Can You Please Mention A Valid User!",
              iconURL: message.author.displayAvatarURL(),
            }),
          ],
        });
      }

      let role = await findMatchingRoles(message.guild, args.slice(2).join(" "));
      role = role[0];

      if (!role) {
        return message.reply({
          embeds: [
            new client.embed().setAuthor({
              name: "Can You Please Provide Me A Role!",
              iconURL: message.author.displayAvatarURL(),
            }),
          ],
        });
      }

      if (!checkRoleHierarchy(message, role, client)) return;

      await handleIndividualRole(message, user, role, action, client, prefix);
      return;
    }

    const user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);

    if (!user) {
      return message.reply({
        embeds: [
          new client.embed().setAuthor({
            name: "Can You Please Mention A User!",
            iconURL: message.author.displayAvatarURL(),
          }),
        ],
      });
    }

    let role = await findMatchingRoles(message.guild, args.slice(1).join(" "));
    role = role[0];

    if (!role) {
      return message.reply({
        embeds: [
          new client.embed().setAuthor({
            name: "Can You Please Provide Me A Role!",
            iconURL: message.author.displayAvatarURL(),
          }),
        ],
      });
    }

    // Check role hierarchy
    if (!checkRoleHierarchy(message, role, client)) return;

    // Auto-detect add or remove based on current roles
    const actionn = user.roles.cache.has(role.id) ? "remove" : "add";
    await handleIndividualRole(message, user, role, actionn, client, prefix);
  },

  // Slash command execution
  run: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    // Handle group operations
    if (["all", "humans", "bots"].includes(subcommand)) {
      const role = interaction.options.getRole("role");

      // Check role hierarchy
      if (!checkRoleHierarchyInteraction(interaction, role, client)) return;

      await interaction.deferReply();
      await handleGroupRoleInteraction(interaction, role, subcommand, client);
      return;
    }

    // Handle add/remove for individual users
    if (["add", "remove"].includes(subcommand)) {
      const user = interaction.options.getMember("user");
      const role = interaction.options.getRole("role");

      // Check role hierarchy
      if (!checkRoleHierarchyInteraction(interaction, role, client)) return;

      await handleIndividualRoleInteraction(
        interaction,
        user,
        role,
        subcommand,
        client
      );
    }
  },
};

// Helper function to check role hierarchy
function checkRoleHierarchy(message, role, client) {
  if (
    message.member.roles.highest.position <= role.position &&
    message.author.id !== message.guild.ownerId
  ) {
    message.channel.send({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | You must have a higher role than **${role.name}** to manage it.`
        ),
      ],
    });
    return false;
  }

  if (message.guild.members.me.roles.highest.position <= role.position) {
    message.channel.send({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | My highest role must be higher than **${role.name}** to manage it.`
        ),
      ],
    });
    return false;
  }

  return true;
}

// Helper function for interaction role hierarchy check
function checkRoleHierarchyInteraction(interaction, role, client) {
  if (
    interaction.member.roles.highest.position <= role.position &&
    interaction.user.id !== interaction.guild.ownerId
  ) {
    interaction.reply({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | You must have a higher role than **${role.name}** to manage it.`
        ),
      ],
      ephemeral: true,
    });
    return false;
  }

  if (interaction.guild.members.me.roles.highest.position <= role.position) {
    interaction.reply({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | My highest role must be higher than **${role.name}** to manage it.`
        ),
      ],
      ephemeral: true,
    });
    return false;
  }

  return true;
}

// Handle group role assignment (prefix command)
async function handleGroupRole(message, role, group, client) {
  let members = [];
  let groupName = group;

  if (group === "humans") {
    members = message.guild.members.cache.filter((member) => !member.user.bot);
  } else if (group === "bots") {
    members = message.guild.members.cache.filter((member) => member.user.bot);
  } else if (group === "all") {
    members = message.guild.members.cache;
    groupName = "all members";
  }

  const giveRoleEmbed = new client.embed()
    .setColor(client.color)
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Role: ${role} is being assigned to ${members.size} members in the ${groupName} group.**`
    )
    .setFooter({
      text: "This operation might take a while depending on the number of members.",
    });

  await message.channel.send({ embeds: [giveRoleEmbed] });

  let successCount = 0;
  let failCount = 0;

  for (const [id, member] of members) {
    try {
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, `Assigned by ${message.author.username}`);
        successCount++;
      }
    } catch (error) {
      console.error(`Failed to add role to ${member.user.tag}:`, error);
      failCount++;
    }
  }

  const resultEmbed = new client.embed()
    .setColor(client.color)
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Successfully assigned ${role} to ${successCount} members.**${
        failCount > 0 ? `\n${client.emoji.cross} Failed to assign to ${failCount} members.` : ""
      }`
    );

  message.channel.send({ embeds: [resultEmbed] });
}

// Handle group role assignment (slash command)
async function handleGroupRoleInteraction(interaction, role, group, client) {
  let members = [];
  let groupName = group;

  if (group === "humans") {
    members = interaction.guild.members.cache.filter(
      (member) => !member.user.bot
    );
  } else if (group === "bots") {
    members = interaction.guild.members.cache.filter((member) => member.user.bot);
  } else if (group === "all") {
    members = interaction.guild.members.cache;
    groupName = "all members";
  }

  const giveRoleEmbed = new client.embed()
    .setColor(client.color)
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Role: ${role} is being assigned to ${members.size} members in the ${groupName} group.**`
    )
    .setFooter({
      text: "This operation might take a while depending on the number of members.",
    });

  await interaction.editReply({ embeds: [giveRoleEmbed] });

  let successCount = 0;
  let failCount = 0;

  for (const [id, member] of members) {
    try {
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, `Assigned by ${interaction.user.username}`);
        successCount++;
      }
    } catch (error) {
      console.error(`Failed to add role to ${member.user.tag}:`, error);
      failCount++;
    }
  }

  const resultEmbed = new client.embed()
    .setColor(client.color)
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Successfully assigned ${role} to ${successCount} members.**${
        failCount > 0 ? `\n${client.emoji.cross} Failed to assign to ${failCount} members.` : ""
      }`
    );

  interaction.followUp({ embeds: [resultEmbed] });
}

// Handle individual user role (prefix command)
async function handleIndividualRole(message, user, role, action, client, prefix) {
  const givee = new client.embed()
    .setColor(client.color)
    .setAuthor({
      name: `Successfully Updated Roles For A User`,
      iconURL: user.user.displayAvatarURL(),
    })
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Target User: ${user}\n${client.emoji.dot} Added: ${role}**`
    )
    .setFooter({
      text: `Click on the Remove Role button to remove @${role.name} role from the target user.`,
    });

  const removee = new client.embed()
    .setColor(client.color)
    .setAuthor({
      name: `Successfully Updated Roles For A User`,
      iconURL: user.user.displayAvatarURL(),
    })
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Target User: ${user}\n${client.emoji.dot} Removed: ${role}**`
    )
    .setFooter({
      text: `Click on the Add Role button to assign @${role.name} role to the target user.`,
    });

  const raadd = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("rad")
      .setLabel("Add Role"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setCustomId("rdel")
      .setEmoji(client.emoji.delete)
  );

  const rremove = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("rr")
      .setLabel("Remove Role"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setCustomId("rdel")
      .setEmoji(client.emoji.delete)
  );

  const currentAction = action === "add" ? "add" : "remove";
  const embed = currentAction === "add" ? givee : removee;
  const reason = `${currentAction.charAt(0).toUpperCase()}${currentAction.slice(1)} By ${message.author.username}`;
  const buttons = currentAction === "add" ? rremove : raadd;

  try {
    await user.roles[currentAction](role, reason);
  } catch (error) {
    return message.channel.send({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | Failed to ${currentAction} role. Please check my permissions.`
        ),
      ],
    });
  }

  const msg = await message.channel.send({
    embeds: [embed],
    components: [buttons],
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => {
      if (message.author.id === i.user.id) return true;
      else {
        i.reply({
          content: `${client.emoji.cross} | That's not your session. Run \`${prefix}role\` to create your own.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    },
    time: 60000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "rad") {
      await user.roles.add(role);
      i.update({ embeds: [givee], components: [rremove] });
    } else if (i.customId === "rr") {
      await user.roles.remove(role);
      i.update({ embeds: [removee], components: [raadd] });
    } else if (i.customId === "rdel") {
      msg.delete();
      collector.stop();
    }
  });

  collector.on("end", () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}

// Handle individual user role (slash command)
async function handleIndividualRoleInteraction(
  interaction,
  user,
  role,
  action,
  client
) {
  const givee = new client.embed()
    .setColor(client.color)
    .setAuthor({
      name: `Successfully Updated Roles For A User`,
      iconURL: user.user.displayAvatarURL(),
    })
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Target User: ${user}\n${client.emoji.dot} Added: ${role}**`
    )
    .setFooter({
      text: `Click on the Remove Role button to remove @${role.name} role from the target user.`,
    });

  const removee = new client.embed()
    .setColor(client.color)
    .setAuthor({
      name: `Successfully Updated Roles For A User`,
      iconURL: user.user.displayAvatarURL(),
    })
    .setDescription(
      `>>> **<:0000013_angel_heart_white_love:1429511090353475765> Target User: ${user}\n${client.emoji.dot} Removed: ${role}**`
    )
    .setFooter({
      text: `Click on the Add Role button to assign @${role.name} role to the target user.`,
    });

  const raadd = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("rad")
      .setLabel("Add Role"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setCustomId("rdel")
      .setEmoji(client.emoji.delete)
  );

  const rremove = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("rr")
      .setLabel("Remove Role"),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setCustomId("rdel")
      .setEmoji(client.emoji.delete)
  );

  const currentAction = action === "add" ? "add" : "remove";
  const embed = currentAction === "add" ? givee : removee;
  const reason = `${currentAction.charAt(0).toUpperCase()}${currentAction.slice(1)} By ${interaction.user.username}`;
  const buttons = currentAction === "add" ? rremove : raadd;

  try {
    await user.roles[currentAction](role, reason);
  } catch (error) {
    return interaction.reply({
      embeds: [
        new client.embed().setDescription(
          `${client.emoji.cross} | Failed to ${currentAction} role. Please check my permissions.`
        ),
      ],
      ephemeral: true,
    });
  }

  const msg = await interaction.reply({
    embeds: [embed],
    components: [buttons],
    fetchReply: true,
  });

  const collector = msg.createMessageComponentCollector({
    filter: (i) => {
      if (interaction.user.id === i.user.id) return true;
      else {
        i.reply({
          content: `${client.emoji.cross} | That's not your session. Run \`${prefix}role\` to create your own.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    },
    time: 60000,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "rad") {
      await user.roles.add(role);
      i.update({ embeds: [givee], components: [rremove] });
    } else if (i.customId === "rr") {
      await user.roles.remove(role);
      i.update({ embeds: [removee], components: [raadd] });
    } else if (i.customId === "rdel") {
      i.update({ embeds: [embed], components: [] });
      collector.stop();
    }
  });

  collector.on("end", () => {
    msg.edit({ components: [] }).catch(() => {});
  });
}

// Find matching roles helper function
function findMatchingRoles(guild, query) {
  const ROLE_MENTION = /<?@?&?(\d{17,20})>?/;
  if (!guild || !query || typeof query !== "string") return [];

  const patternMatch = query.match(ROLE_MENTION);
  if (patternMatch) {
    const id = patternMatch[1];
    const role = guild.roles.cache.get(id);
    if (role) return [role];
  }

  const exact = [];
  const startsWith = [];
  const includes = [];
  guild.roles.cache.forEach((role) => {
    if (role.managed) return;
    const lowerName = role.name.toLowerCase();
    if (role.name === query) exact.push(role);
    if (lowerName.startsWith(query.toLowerCase())) startsWith.push(role);
    if (lowerName.includes(query.toLowerCase())) includes.push(role);
  });
  if (exact.length > 0) return exact;
  if (startsWith.length > 0) return startsWith;
  if (includes.length > 0) return includes;
  return [];
}