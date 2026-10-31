module.exports = {
  name: "roleinfo",
  category: "Information",
  aliases: ["rinfo"],
  cooldown: 3,
  description: "to roles of the user",
  args: false,
  usage: "",
  userPerms: [],

  execute: async (message, args, client, prefix) => {
    const role =
      message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | You didn't provided a valid role.`
          ),
        ],
      });
    }
    const color = role.hexColor;
    const created = `<t:${Math.round(role.createdTimestamp / 1000)}:R>`;
    let rolemembers;
    if (role.members.size > 20)
      rolemembers =
        role.members
          .map((e) => `<@${e.id}>`)
          .slice(0, 20)
          .join(", ") + ` and ${role.members.size - 20} more members...`;
    if (role.members.size < 20)
      rolemembers = role.members.map((e) => `<@${e.id}>`).join(", ");
    const embed = new client.embed()
      .setTitle(`${role.name}'s Information`)
      .addFields([
        {
          name: `**__General Info__**`,
          value: `**Role Name:** ${role.name}\n**Role Id:** \`${role.id}\`\n**Role Position:** ${role.rawPosition}\n**Color:** ${color}\n**Created At:** ${created}\n**Mentionability:** ${role.mentionable}\n**Integration:** ${role.managed}`,
        },
      ])
      .addFields([
        {
          name: "**__Roles__**",
          value: `**Role Members Size:** ${
            role.members.size || 0
          }\n**Role Members:** ${rolemembers || "Not Found"}`,
        },
      ])
      .addFields([
        {
          name: `**__Key Permissions__**`,
          value: `${
            role.permissions.toArray().includes("ADMINISTRATOR")
              ? `\`ADMINISTRATOR\``
              : role.permissions
                  .toArray()
                  .sort((a, b) => a.localeCompare(b))
                  .map((p) => `\`${p}\``)
                  .join(", ")
          }`,
          inline: true,
        },
      ])
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: `Requested by` + message.author.tag,
        iconURL: message.author.displayAvatarURL(),
      })
      .setColor(client.color);
    message.reply({ embeds: [embed] });
  },
};
