const { MessageFlags } = require("discord.js");
const Team = require("@data/team");

module.exports = {
  name: "team",
  aliases: ["tm"],
  description: "Manage team roles (add, remove, list, clear).",
  category: "Owner",
  args: true,
  usage: "<add|remove|list|clear> [role] [user]",
  execute: async (message, args, client) => {
    const validRoles = ["developer", "owner", "manager", "staff", "admin"];
    const subcommand = args[0].toLowerCase();

    const box = client.box();
    box.text("Invalid subcommand!").sep();
    box.text("Available subcommands:").sep();
    box.text("• add <role> <user> - Add user to role").sep();
    box.text("• remove <role> <user> - Remove user from role").sep();
    box.text("• list [role] - List all roles or specific role").sep();
    box.text("• clear <role> - Clear all users from role").sep();
    switch (subcommand) {
      case "add":
      case "a":
        return handleAdd(message, args, client, validRoles);

      case "remove":
      case "r":
        return handleRemove(message, args, client, validRoles);

      case "list":
      case "l":
        return handleList(message, args, client, validRoles);

      case "clear":
      case "c":
        return handleClear(message, args, client, validRoles);

      default:
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [box],
        });
    }
  },
};

async function handleAdd(message, args, client, validRoles) {
  if (args.length < 3) {
    return message.reply("Usage: `team add <role> <user>`");
  }

  const role = args[1].toLowerCase();
  if (!validRoles.includes(role)) {
    const box = client.box();
    box.text("Invalid role!").sep();
    box.text("Valid roles:").sep();
    validRoles.forEach((r) => box.text(`• ${r}`).sep());
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });
  }

  const user =
    message.mentions.users.first() ||
    (await message.client.users.fetch(args[2]).catch(() => null));

  if (!user) {
    return message.reply(
      "Please mention a valid user or provide a valid user ID."
    );
  }

  let team = await Team.findOne();
  if (!team) team = new Team();

  // Check if user is already in this role
  if (team[role].includes(user.id)) {
    return message.reply(`${user.tag} is already in the ${role} role.`);
  }

  // Remove user from all roles to keep unique
  for (const r of validRoles) {
    team[r] = team[r].filter((id) => id !== user.id);
  }

  // Add user to the role
  team[role].push(user.id);

  await team.save();
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      client.box().text(`${client.emoji.tick} Added ${user.tag} to ${role} role.`).sep(),
    ],
  });
}

async function handleRemove(message, args, client, validRoles) {
  if (args.length < 3) {
    return message.reply("Usage: `team remove <role> <user>`");
  }

  const role = args[1].toLowerCase();
  if (!validRoles.includes(role)) {
    const box = client.box();
    box.text("Invalid role!").sep();
    box.text("Valid roles:").sep();
    validRoles.forEach((r) => box.text(`• ${r}`).sep());
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });
  }

  const user =
    message.mentions.users.first() ||
    (await message.client.users.fetch(args[2]).catch(() => null));

  if (!user) {
    return message.reply(
      "Please mention a valid user or provide a valid user ID."
    );
  }

  let team = await Team.findOne();
  if (!team) team = new Team();

  // Check if user is in this role
  if (!team[role].includes(user.id)) {
    return message.reply(`${user.tag} is not in the ${role} role.`);
  }

  // Remove user from the role
  team[role] = team[role].filter((id) => id !== user.id);

  await team.save();
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      client.box().text(`${client.emoji.tick} Removed ${user.tag} from ${role} role.`).sep(),
    ],
  });
}

async function handleList(message, args, client, validRoles) {
  let team = await Team.findOne();
  if (!team) team = new Team();

  const box = client.box();

  // If specific role is provided
  if (args[1]) {
    const role = args[1].toLowerCase();
    if (!validRoles.includes(role)) {
      box.text("Invalid role!").sep();
      box.text("Valid roles:").sep();
      validRoles.forEach((r) => box.text(`• ${r}`).sep());
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [box],
      });
    }

    box.text(`${role.toUpperCase()} Role Members:`).sep();
    if (team[role].length === 0) {
      box.text("No members in this role.").sep();
    } else {
      for (const userId of team[role]) {
        try {
          const user = await client.users.fetch(userId);
          box.text(`• ${user.tag} (${userId})`).sep();
        } catch (error) {
          box.text(`• Unknown User (${userId})`).sep();
        }
      }
    }
  } else {
    // List all roles
    box.text("Team Roles:").sep();
    for (const role of validRoles) {
      const count = team[role].length;
      box
        .text(`${role.toUpperCase()}: ${count} member${count !== 1 ? "s" : ""}`)
        .sep();
    }
  }

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [box],
  });
}

async function handleClear(message, args, client, validRoles) {
  if (args.length < 2) {
    return message.reply("Usage: `team clear <role>`");
  }

  const role = args[1].toLowerCase();
  if (!validRoles.includes(role)) {
    const box = client.box();
    box.text("Invalid role!").sep();
    box.text("Valid roles:").sep();
    validRoles.forEach((r) => box.text(`• ${r}`).sep());
    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [box],
    });
  }

  let team = await Team.findOne();
  if (!team) team = new Team();

  const memberCount = team[role].length;
  if (memberCount === 0) {
    return message.reply(`The ${role} role is already empty.`);
  }

  // Clear the role
  team[role] = [];

  await team.save();
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      client
        .box()
        .text(
          `${client.emoji.tick} Cleared ${memberCount} member${memberCount !== 1 ? "s" : ""} from ${role} role.`
        )
        .sep(),
    ],
  });
}
