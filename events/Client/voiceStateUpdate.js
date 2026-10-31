const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const VoiceConfig = require("@data/voiceConfig");
const waitingRooms = new Map();

async function sendWaitingPromptVC(client, guild, waitingMember, ownerId, ownerVcId, waitingChannel) {
  try {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`waiting_accept_${waitingMember.id}_${waitingChannel.id}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`waiting_deny_${waitingMember.id}_${waitingChannel.id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const ownerVC = guild.channels.cache.get(ownerVcId);
    if (!ownerVC) return;

    let targetChannel = null;

    // 1) Prefer a text channel in same category
    if (ownerVC.parentId) {
      const textInCategory = guild.channels.cache.find(
        c => c.parentId === ownerVC.parentId && c.isTextBased() && c.viewable
      );
      if (textInCategory) targetChannel = textInCategory;
    }

    // 2) Fallback to system channel if viewable
    if (!targetChannel && guild.systemChannel?.viewable) {
      targetChannel = guild.systemChannel;
    }

    // 3) Fallback to any accessible text channel
    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.isTextBased() && c.viewable);
    }

    if (!targetChannel) {
      return console.warn(`No accessible text channel found in ${guild.name} to notify owner about waiting member.`);
    }

    await targetChannel.send({
      content: `<@${ownerId}> — ${waitingMember} is waiting to join your VC **${ownerVC.name}**.\nChoose an action below:`,
      components: [row]
    }).catch(err => {
      console.error("Failed to send waiting prompt to text channel:", err);
    });

  } catch (err) {
    console.error("Failed to send VC waiting prompt:", err);
  }
}


async function updateOwnership(client, guild, vcId, newOwnerId) {
  try {
    const vc = guild.channels.cache.get(vcId);
    if (!vc) return;
    const member = await guild.members.fetch(newOwnerId).catch(() => null);
    if (!member) return;

    // Build permission overwrites safely
    const overwrites = [
      {
        id: guild.roles.everyone.id ?? guild.roles.everyone,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: newOwnerId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      ...vc.members
        .filter((m) => m.id !== newOwnerId)
        .map((m) => ({
          id: m.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        })),
    ];

    await vc.permissionOverwrites.set(overwrites).catch(err => {
      console.error("Failed to set permission overwrites on VC:", err);
    });
       client.tempVoice.set(newOwnerId, vcId);
       client.vcOwners.set(vcId, newOwnerId);
    await vc.setName(`${member.user.displayName}`).catch(() => {});
  } catch (error) {
    console.error("Failed to update ownership:", error);
  }
}

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;
    if (!newState.guild) return;

    try {
      const data = await VoiceConfig.findOne({ guildID: newState.guild.id });
      if (!data) return;
      const joinToCreateChannelId = data.channelID;
      const categoryId = data.categoryID;
      if (!client.tempVoice) client.tempVoice = new Map();
      if (!client.vcOwners) client.vcOwners = new Map();
      if (!client.waitingRooms) client.waitingRooms = waitingRooms;
      if (newState.channelId && newState.channel) {
        const waitingRoomData = client.waitingRooms.get(newState.channelId);
        if (waitingRoomData) {
          console.log(`User joined waiting room ${newState.channel.name}`);
          const { ownerId, ownerVcId } = waitingRoomData;
          await sendWaitingPromptVC(client, newState.guild, newState.member, ownerId, ownerVcId, newState.channel);
          return;
        }
      }

      // USER JOINED JOIN-TO-CREATE CHANNEL
      if (newState.channelId === joinToCreateChannelId) {
        const existingVCId = client.tempVoice.get(newState.member.id);
        if (existingVCId) {
          const existingVC = newState.guild.channels.cache.get(existingVCId);
          if (existingVC && existingVC.parentId === categoryId) {
            // Move into existing VC (if still available)
            await newState.member.voice.setChannel(existingVC).catch(() => {});
            return;
          }
        }

        // Create new VC and wait shortly to let cache settle before moving user
        const newVC = await newState.guild.channels.create({
          name: `${newState.member.user.displayName}`,
          type: ChannelType.GuildVoice,
          parent: categoryId,
          permissionOverwrites: [
            {
              id: newState.guild.roles.everyone.id ?? newState.guild.roles.everyone,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            },
            {
              id: newState.member.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.ManageChannels,
              ],
            },
          ],
        }).catch(err => {
          console.error("Failed to create temp VC:", err);
          return null;
        });

        if (!newVC) return;

        // small wait so discord caches the channel (helps avoid quick disconnects)
        await new Promise((res) => setTimeout(res, 500));

        await newVC.setUserLimit(0).catch(() => {});
        await newState.member.voice.setChannel(newVC).catch(err => {
          console.error("Failed to move member to new VC:", err);
        });

        client.tempVoice.set(newState.member.id, newVC.id);
        client.vcOwners.set(newVC.id, newState.member.id);
        return;
      }

      // USER LEFT VC CLEANUP/TRANSFER
      if (
        oldState.channelId &&
        oldState.channel?.parentId === categoryId &&
        oldState.channelId !== joinToCreateChannelId
      ) {
        const oldVC = oldState.channel;
        const ownerId = client.vcOwners.get(oldVC.id);

        if (ownerId === oldState.id) {
          // owner left
          if (oldVC.members.size === 0) {
            client.vcOwners.delete(oldVC.id);
            client.tempVoice.delete(oldState.id);
            setTimeout(async () => {
              if (oldVC.deleted) return;
              if (oldVC.members.size === 0)
                await oldVC.delete().catch(() => {});
            }, 5000);
          } else {
            client.vcOwners.delete(oldVC.id);
            const nextOwner = oldVC.members.first();
            if (nextOwner)
              await updateOwnership(client, oldState.guild, oldVC.id, nextOwner.id);
          }
        } else {
          // non-owner left
          if (oldVC.members.size === 0) {
            client.vcOwners.delete(oldVC.id);
            client.tempVoice.delete(oldState.id);
            setTimeout(async () => {
              if (oldVC.deleted) return;
              if (oldVC.members.size === 0)
                await oldVC.delete().catch(() => {});
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error("Error in voiceStateUpdate:", error);
    }
  },
};
