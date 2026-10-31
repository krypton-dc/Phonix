function cleanTitle(title, artist) {
  // Common phrases and patterns to remove
  const regexPatterns = [
    /\(feat\. .*\)|\[feat\. .*\]/gi, // Feat. Artist tags
    /\[.*?\]|\(.*?\)|\{.*?\}/g, // Any text in brackets or parentheses
    /\|.*|official|audio|music|video|lyrics|lyric|hd|4k/gi, // Common separators and keywords
  ];

  let cleanedTitle = title;

  // Run through all patterns and remove
  for (const pattern of regexPatterns) {
    cleanedTitle = cleanedTitle.replace(pattern, "");
  }

  // Handle separators like " - "
  if (artist) {
    const separators = ["-", "–", "—"];
    for (const sep of separators) {
      if (cleanedTitle.includes(sep)) {
        const parts = cleanedTitle.split(sep);
        if (parts.length > 1) {
          // Remove the artist's name if it appears in the title, regardless of position
          const artistRegex = new RegExp(`\\b${artist}\\b`, "gi");
          cleanedTitle = cleanedTitle.replace(artistRegex, "").trim();

          // After removing the artist, re-evaluate the parts
          const newParts = cleanedTitle
            .split(sep)
            .filter((p) => p.trim() !== "");
          cleanedTitle = newParts.length > 0 ? newParts[0] : cleanedTitle;
        }
        break;
      }
    }
  }

  // Final trim and cleanup
  cleanedTitle = cleanedTitle.trim();
  cleanedTitle = cleanedTitle.replace(/[\-–—\s]+$/, "");

  return cleanedTitle;
}

module.exports = { cleanTitle };
