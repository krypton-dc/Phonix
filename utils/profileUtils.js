const socials = require("./social");

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getEmoji(platform) {
  return socials[platform]?.emoji || "🔗";
}

function getPlaceholder(platform, type) {
  return socials[platform]?.placeholders?.[type] || "";
}

function validateURL(platform, url) {
  const regex = socials[platform]?.regex;
  return regex ? regex.test(url) : true;
}

module.exports = { capitalize, getEmoji, getPlaceholder, validateURL };
