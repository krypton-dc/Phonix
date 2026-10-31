const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { LoggingSetup } = require("@data/logging");
async function sendLog(client, guild, eventKey, embed) {
  const config = await LoggingSetup.findOne({ Guild: guild.id });
  if (!config?.Enabled) return;

  const types = config.Types || {};
  let channelId;

  for (const typeKey in types) {
    if (types[typeKey][eventKey]) {
      channelId = types[typeKey][eventKey];
      break;
    }
  }

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send log to ${channelId}:`, error);
  }
}

/**
 * Get the executor of an audit log action
 */
async function getAuditLogExecutor(guild, actionType, targetId, filter) {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: actionType,
      limit: 5,
    });

    const entry = auditLogs.entries.find((e) => {
      if (e.targetId !== targetId) return false;
      if (filter && !filter(e)) return false;
      return Date.now() - e.createdTimestamp < 5000; // Within 5 seconds
    });

    return entry?.executor || null;
  } catch {
    return null;
  }
}

/**
 * Create a diff field showing old → new changes
 */
function createDiffField(name, oldValue, newValue, inline = true) {
  if (oldValue === newValue) return null;
  
  const oldStr = oldValue?.toString() || "None";
  const newStr = newValue?.toString() || "None";
  
  return {
    name,
    value: `${oldStr} → ${newStr}`,
    inline,
  };
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

/**
 * Format relative timestamp
 */
function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

/**
 * Truncate text to a maximum length
 */
function truncate(text, maxLength = 1024) {
  if (!text) return "None";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Compare arrays and return added/removed items
 */
function compareArrays(oldArr, newArr) {
  const added = newArr.filter((item) => !oldArr.includes(item));
  const removed = oldArr.filter((item) => !newArr.includes(item));
  return { added, removed };
}

/**
 * Format permissions diff
 */
function formatPermissionsDiff(oldPerms, newPerms) {
  const oldArr = oldPerms?.toArray() || [];
  const newArr = newPerms?.toArray() || [];
  const { added, removed } = compareArrays(oldArr, newArr);

  const fields = [];
  
  if (added.length > 0) {
    fields.push({
      name: "Permissions Added",
      value: added.map((p) => `\`${p}\``).join(", "),
      inline: false,
    });
  }
  
  if (removed.length > 0) {
    fields.push({
      name: "❌ Permissions Removed",
      value: removed.map((p) => `\`${p}\``).join(", "),
      inline: false,
    });
  }

  return fields;
}

/**
 * Format roles diff
 */
function formatRolesDiff(oldRoles, newRoles) {
  const oldArr = oldRoles?.cache.map((r) => r.id) || [];
  const newArr = newRoles?.cache.map((r) => r.id) || [];
  const { added, removed } = compareArrays(oldArr, newArr);

  const fields = [];
  
  if (added.length > 0) {
    fields.push({
      name: "Roles Added",
      value: added.map((id) => `<@&${id}>`).join(", "),
      inline: false,
    });
  }
  
  if (removed.length > 0) {
    fields.push({
      name: "❌ Roles Removed",
      value: removed.map((id) => `<@&${id}>`).join(", "),
      inline: false,
    });
  }

  return fields;
}

/**
 * Get color based on log type
 */
function getLogColor(type) {
  const colors = {
    delete: 0xed4245, // Red
    create: 0x57f287, // Green
    update: 0xfee75c, // Yellow
    join: 0x57f287, // Green
    leave: 0xed4245, // Red
    ban: 0xed4245, // Red
    unban: 0x57f287, // Green
    warning: 0xfee75c, // Yellow
    info: 0x5865f2, // Blurple
  };
  return colors[type] || 0x5865f2;
}

module.exports = {
  sendLog,
  getAuditLogExecutor,
  createDiffField,
  formatTimestamp,
  formatRelativeTime,
  truncate,
  compareArrays,
  formatPermissionsDiff,
  formatRolesDiff,
  getLogColor,
};