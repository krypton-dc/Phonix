const Premium = require(`@data/premium`)

module.exports = (client) => {
client.getPrm = async (guildId) => {
  const premiums = await Premium.find({
    "boosts.guildId": guildId,
  });

  return premiums.reduce((total, u) => {
    const b = u.boosts.find(x => x.guildId === guildId);
    return total + (b?.count || 0);
  }, 0);
}
}