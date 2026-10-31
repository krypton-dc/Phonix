/** @format
 *
 * Phonix Utility - User Profile URL
 */

module.exports = (client) => {
  client.url = (id) => {
    if (!id || isNaN(id))
      throw new Error("Invalid user ID provided to client.url()");
    return `https://discord.com/users/${id}`;
  };
};
