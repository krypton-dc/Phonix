const { AuditLogEvent } = require("discord.js");
const { handleAntinukeAction } = require("@utils/AntinukeFucker");

module.exports = [
  {
    name: "channelCreate",
    run: async (c, channel) =>
      await handleAntinukeAction(
        c,
        channel.guild,
        AuditLogEvent.ChannelCreate,
        "channelCreate",
        channel
      ),
  },
  {
    name: "channelUpdate",
    run: async (c, oldCh, newCh) =>
      await handleAntinukeAction(
        c,
        newCh.guild,
        AuditLogEvent.ChannelUpdate,
        "channelUpdate",
        newCh,
        {
          name: oldCh.name,
          type: oldCh.type,
          topic: oldCh.topic,
          nsfw: oldCh.nsfw,
          bitrate: oldCh.bitrate,
          userLimit: oldCh.userLimit,
          rateLimitPerUser: oldCh.rateLimitPerUser,
          parentId: oldCh.parentId,
          position: oldCh.position,
        }
      ),
  },
  {
    name: "channelDelete",
    run: async (c, channel) =>
      await handleAntinukeAction(
        c,
        channel.guild,
        AuditLogEvent.ChannelDelete,
        "channelDelete",
        null, // Don't pass the deleted channel as payload since it can't be used anymore
        {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          topic: channel.topic,
          nsfw: channel.nsfw,
          bitrate: channel.bitrate,
          userLimit: channel.userLimit,
          rateLimitPerUser: channel.rateLimitPerUser,
          parentId: channel.parentId,
          position: channel.position,
          rawPosition: channel.rawPosition, // Added this for better positioning
          permissionOverwrites: channel.permissionOverwrites?.cache ? 
            Array.from(channel.permissionOverwrites.cache.values()).map(overwrite => ({
              id: overwrite.id,
              type: overwrite.type,
              allow: overwrite.allow.bitfield,
              deny: overwrite.deny.bitfield
            })) : [], // Preserve permission overwrites
        }
      ),
  },
];