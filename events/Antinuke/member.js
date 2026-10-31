const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  { name: "guildMemberRemove", run: async (c, m) => await handleAntinukeAction(c, m.guild, AuditLogEvent.MemberKick, "memberKick", m) },
  { name: "guildBanAdd", run: async (c, ban) => await handleAntinukeAction(c, ban.guild, AuditLogEvent.MemberBanAdd, "memberBanAdd", ban) },
  { name: "guildBanRemove", run: async (c, ban) => await handleAntinukeAction(c, ban.guild, AuditLogEvent.MemberBanRemove, "memberBanRemove", ban) },
  { name: "guildMemberUpdate", run: async (c, o, n) => await handleAntinukeAction(c, n.guild, AuditLogEvent.MemberUpdate, "memberUpdate", n) },
];
