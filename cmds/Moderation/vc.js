const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "vc",
  category: "Moderation",
  aliases: ["voicechannel"],
  cooldown: 3,
  description:
    "Voice moderation commands: mute, unmute, kick, deafen, undeafen, moveall, muteall, unmuteall, deafall, undeafall, kickall, pull.",
  usage: "vc <subcommand> <@user|user_id>",
  userPerms: ["MoveMembers"],
  botPerms: ["MoveMembers"],
  args: true,

  execute: async (message, args, client, prefix) => {
    const sub = args[0]?.toLowerCase();
    const targetArg = args[1];
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(targetArg);

    if (
      [
        "mute",
        "unmute",
        "kick",
        "deafen",
        "undeafen",
        "pull"
      ].includes(sub)
    ) {
      if (!member) {
        return message.reply({
          embeds: [
            new client.embed().d(
              `${client.emoji.cross} | Please mention a valid user or provide their ID.`
            ),
          ],
        });
      }
      if (member.id === message.author.id) {
        return message.reply({
          embeds: [
            new client.embed().d(
              `${client.emoji.cross} | You cannot perform this action on yourself.`
            ),
          ],
        });
      }
      if (!member.voice.channel && sub !== "pull") {
        return message.reply({
          embeds: [
            new client.embed().d(
              `${client.emoji.cross} | That user is not in a voice channel.`
            ),
          ],
        });
      }
    }

    const authorChannel = message.member.voice.channel;

    try {
      switch (sub) {
        case "mute": {
          await member.voice.setMute(true);
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Muted <@${member.id}> in their VC!`
              ),
            ],
          });
        }
        case "unmute": {
          await member.voice.setMute(false);
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Unmuted <@${member.id}> in their VC!`
              ),
            ],
          });
        }
        case "kick": {
          await member.voice.disconnect();
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Kicked <@${member.id}> from the VC!`
              ),
            ],
          });
        }
        case "deafen": {
          await member.voice.setDeaf(true);
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Deafened <@${member.id}> in their VC!`
              ),
            ],
          });
        }
        case "undeafen": {
          await member.voice.setDeaf(false);
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Undeafened <@${member.id}> in their VC!`
              ),
            ],
          });
        }

        // ───────────────────────────────
        // 📥 PULL
        // ───────────────────────────────
        case "pull": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to pull someone.`
                ),
              ],
            });
          }
          if (!member.voice.channel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | That user is not in any VC.`
                ),
              ],
            });
          }
          if (member.voice.channel.id === authorChannel.id) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | That user is already in your VC.`
                ),
              ],
            });
          }

          await member.voice.setChannel(authorChannel).catch((err) => {
            throw new Error("Unable to move that member.");
          });

          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Pulled <@${member.id}> into your VC <#${authorChannel.id}>!`
              ),
            ],
          });
        }

        // ───────────────────────────────
        // 🧍 MOVE / MUTE / DEAF ALL
        // ───────────────────────────────
        case "moveall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`moveall\`.`
                ),
              ],
            });
          }
          const channels = message.guild.channels.cache.filter(
            (ch) => ch.isVoiceBased() && ch.id !== authorChannel.id
          );
          let moved = 0;
          for (const vc of channels.values()) {
            for (const mem of vc.members.values()) {
              await mem.voice.setChannel(authorChannel).catch(() => {});
              moved++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Moved ${moved} users to <#${authorChannel.id}>.`
              ),
            ],
          });
        }
        case "muteall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`muteall\`.`
                ),
              ],
            });
          }
          let muted = 0;
          for (const mem of authorChannel.members.values()) {
            if (!mem.user.bot) {
              await mem.voice.setMute(true).catch(() => {});
              muted++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Muted ${muted} users in your VC.`
              ),
            ],
          });
        }
        case "unmuteall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`unmuteall\`.`
                ),
              ],
            });
          }
          let unmuted = 0;
          for (const mem of authorChannel.members.values()) {
            if (!mem.user.bot) {
              await mem.voice.setMute(false).catch(() => {});
              unmuted++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Unmuted ${unmuted} users in your VC.`
              ),
            ],
          });
        }
        case "deafall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`deafall\`.`
                ),
              ],
            });
          }
          let deafed = 0;
          for (const mem of authorChannel.members.values()) {
            if (!mem.user.bot) {
              await mem.voice.setDeaf(true).catch(() => {});
              deafed++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Deafened ${deafed} users in your VC.`
              ),
            ],
          });
        }
        case "undeafall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`undeafall\`.`
                ),
              ],
            });
          }
          let undeafed = 0;
          for (const mem of authorChannel.members.values()) {
            if (!mem.user.bot) {
              await mem.voice.setDeaf(false).catch(() => {});
              undeafed++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Undeafened ${undeafed} users in your VC.`
              ),
            ],
          });
        }
        case "kickall": {
          if (!authorChannel) {
            return message.reply({
              embeds: [
                new client.embed().d(
                  `${client.emoji.cross} | You must be in a VC to use \`kickall\`.`
                ),
              ],
            });
          }
          let kicked = 0;
          for (const mem of authorChannel.members.values()) {
            if (!mem.user.bot) {
              await mem.voice.disconnect().catch(() => {});
              kicked++;
            }
          }
          return message.reply({
            embeds: [
              new client.embed().d(
                `${client.emoji.tick} | Kicked ${kicked} users from your VC.`
              ),
            ],
          });
        }
      }
    } catch (error) {
      console.error(error);
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | An error occurred: \`${error.message}\`.`
          ),
        ],
      });
    }
  },
};
