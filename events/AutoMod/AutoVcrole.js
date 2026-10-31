// events/voiceStateUpdate/voiceRole.js
const VoiceRole = require("@data/voicerole");

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guild = newState.guild;
    if (!guild || !guild.available) return;

    try {
      // Fetch config
      const voiceRoleConfig = await VoiceRole.findOne({ guildId: guild.id });
      if (!voiceRoleConfig) return;

      const member = newState.member;
      if (!member) return;

      // Select correct role based on user type
      const roleId = member.user.bot
        ? voiceRoleConfig.botRole
        : voiceRoleConfig.humanRole;

      if (!roleId) return;

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        console.log(
          `Role not found in guild ${guild.name}. Removing configuration.`
        );
        // Clean only the missing part, don’t nuke both
        if (member.user.bot) {
          voiceRoleConfig.botRole = null;
        } else {
          voiceRoleConfig.humanRole = null;
        }
        await voiceRoleConfig.save();
        return;
      }

      // CASE 1: Member joins a VC
      if (!oldState.channelId && newState.channelId) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(role).catch(async () => {
            console.log(
              `Missing permissions to assign role in ${guild.name}. Removing configuration.`
            );
            if (member.user.bot) {
              voiceRoleConfig.botRole = null;
            } else {
              voiceRoleConfig.humanRole = null;
            }
            await voiceRoleConfig.save();
          });
        }
      }

      // CASE 2: Member leaves a VC
      if (oldState.channelId && !newState.channelId) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role).catch(async () => {
            console.log(
              `Missing permissions to remove role in ${guild.name}. Removing configuration.`
            );
            if (member.user.bot) {
              voiceRoleConfig.botRole = null;
            } else {
              voiceRoleConfig.humanRole = null;
            }
            await voiceRoleConfig.save();
          });
        }
      }

      // CASE 3: Switch channels → do nothing
    } catch (err) {
      console.error(`Error in voice role system for ${guild.name}:`, err);
    }
  },
};
