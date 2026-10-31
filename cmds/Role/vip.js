const Roles = require("@data/roles");

module.exports = {
  name: "vip",
  category: "Role",
  aliases: ["vip"],
  description: "Assigns the 'vip' role to a specified user.",
  args: true,
  usage: "<user>",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    try {
      const guildId = message.guild.id;
      const guildRoles = await Roles.findOne({ guildId });

      if (!guildRoles) {
        return message.channel.send({
          embeds: [
            new client.embed().setDescription(
              `No role configuration found for this server.`
            ),
          ],
        });
      }

      const reqRole = guildRoles.reqrole;
      if (!reqRole) {
        return message.channel.send({
          embeds: [
            new client.embed().setDescription(
              `There is no **Required Role** for **Custom Roles**.`
            ),
          ],
        });
      }

      if (
        !message.member.permissions.has("Administrator") &&
        message.author.id !== message.guild.ownerId &&
        !message.member.roles.cache.has(reqRole)
      ) {
        return message.channel.send({
          embeds: [
            new client.embed().setDescription(
              `You are not allowed to run this command.`
            ),
          ],
        });
      }

      // Validate user input
      const targetMember =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]);
      if (!targetMember) {
        return message.channel.send({
          content: `Please provide a valid user.`,
        });
      }

      // Check for the vip role
      const vipRole = guildRoles.vip; // Assuming vipRole is a single role ID
      if (!vipRole) {
        return message.channel.send({
          embeds: [
            new client.embed().setDescription(
              `There is no **vip Role** set for **Custom Roles**.`
            ),
          ],
        });
      }

      // Get the role object for the vip role
      const roleToAssign = message.guild.roles.cache.get(vipRole);
      if (!roleToAssign) {
        return message.channel.send({
          embeds: [
            new client.embed().setDescription(
              `I couldn't find the **vip role** in this server. It might have been deleted!`
            ),
          ],
        });
      }

      // Assign or remove the role from the user
      let responseMessage = "";

      if (targetMember.roles.cache.has(roleToAssign.id)) {
        await targetMember.roles.remove(roleToAssign);
        responseMessage = `Successfully removed ${roleToAssign} from ${targetMember}.`;
      } else {
        await targetMember.roles.add(roleToAssign);
        responseMessage = `Successfully added ${roleToAssign} to ${targetMember}.`;
      }

      return message.channel.send({
        embeds: [new client.embed().d(responseMessage)],
      });
    } catch (error) {
      console.error(error);
      return message.channel.send({
        embeds: [
          new client.embed().d(
            `An error occurred while executing the command.`
          ),
        ],
      });
    }
  },
};
