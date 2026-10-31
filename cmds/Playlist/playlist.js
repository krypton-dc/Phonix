const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: "playlist",
  aliases: ["pl"],
  category: "Playlist",
  cooldown: 3,
  description: "Play the saved Playlist.",
  args: false,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const x = await client.users.cache.get(client.owner);

    const shuffleArray = (array) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const embed = new client.embed().setColor(client.color).setAuthor({
      name: `Some Qt Playlists By ${client.user.username}`,
      iconURL: x.displayAvatarURL(),
      url: client.config.links.vote,
    });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_pop")
        .setPlaceholder("Playlist Area!")
        .addOptions([
          {
            label: "Hindi Songs!",
            value: "hindi1",
          },
          {
            label: "English Songs!",
            value: "english1",
          },
          {
            label: "Sad Lofi Songs!",
            value: "sad1",
          },
        ])
    );

    let player = client.manager.players.get(message.guild.id);
    if (!player) {
      player = await client.manager.createPlayer({
        guildId: message.guild.id,
        voiceId: message.member.voice.channel.id,
        textId: message.channel.id,
        shardId: message.guild.shardId,
        volume: 80,
        deaf: true,
      });
    }

    const msg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (message.author.id === i.user.id) return true;
        else {
          i.reply({
            content: `${client.emoji.cross} | That's not your session. Run \`${prefix}playlist\` to create your own.`,
            ephemeral: true,
          });
          return false;
        }
      },
      time: 60000,
    });

    const embedh = new client.embed().setColor(client.color).setAuthor({
      name: `Added Hindi Songs <3 By ${client.user.username}`,
      iconURL: message.author.displayAvatarURL(),
      url: client.config.links.support,
    });

    const embede = new client.embed().setColor(client.color).setAuthor({
      name: `Added English Songs <3 By ${client.user.username}`,
      iconURL: message.author.displayAvatarURL(),
      url: client.config.links.support,
    });

    const embeds = new client.embed().setColor(client.color).setAuthor({
      name: `Added Hindi x English Songs <3 By ${client.user.username}`,
      iconURL: message.author.displayAvatarURL(),
      url: client.config.links.support,
    });

    collector.on("collect", async (i) => {
      if (i.isStringSelectMenu()) {
        let query;
        let responseEmbed;

        if (i.values.includes("hindi1")) {
          query =
            "https://open.spotify.com/playlist/6NQ4YKiZvBpN7z6RKiXI4v?si=Kc9qVxxcRPqbprUhF22jZg&pi=-tKhh-SAQRWzg";
          responseEmbed = embedh;
        } else if (i.values.includes("english1")) {
          query =
            "https://open.spotify.com/playlist/5muSk2zfQ3LI70S64jbrX7?si=7T8nsPW-TT6IXl8MToBNIA";
          responseEmbed = embede;
        } else if (i.values.includes("sad1")) {
          query = "https://youtu.be/0WD6vxQz5-I?si=I2t9lMTNHtJKfbqj";
          responseEmbed = embeds;
        }

        const result = await player.search(query, {
          requester: message.author,
        });

        if (!result.tracks.length) {
          return message.reply({
            embeds: [
              new client.embed()
                .setAuthor({
                  name: message.author.username || "Unknown User",
                  iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })

                .d(`No results found for \`${query}\`.`),
            ],
          });
        }

        const tracks = result.tracks;
        if (result.type === "PLAYLIST") {
          shuffleArray(tracks);
          for (const track of tracks) player.queue.add(track);
        } else {
          player.queue.add(tracks[0]);
        }

        if (!player.playing && !player.paused) player.play();
        await player.setLoop("queue");

        return i.update({ embeds: [responseEmbed], components: [] });
      }
    });
  },
};
