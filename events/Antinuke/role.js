const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "roleCreate",
    run: async (c, role) =>
      await handleAntinukeAction(
        c,
        role.guild,
        AuditLogEvent.RoleCreate,
        "roleCreate",
        role
      ),
  },
  {
    name: "roleUpdate",
    run: async (c, oldRole, newRole) =>
      await handleAntinukeAction(
        c,
        newRole.guild,
        AuditLogEvent.RoleUpdate,
        "roleUpdate",
        newRole,
        {
          name: oldRole.name,
          color: oldRole.color,
          permissions: oldRole.permissions.bitfield,
          hoist: oldRole.hoist,
          mentionable: oldRole.mentionable,
          position: oldRole.position,
        }
      ),
  },
  {
    name: "roleDelete",
    run: async (c, role) =>
      await handleAntinukeAction(
        c,
        role.guild,
        AuditLogEvent.RoleDelete,
        "roleDelete",
        role,
        {
          name: role.name,
          color: role.color,
          permissions: role.permissions.bitfield,
          hoist: role.hoist,
          mentionable: role.mentionable,
          position: role.position,
        }
      ),
  },
];
