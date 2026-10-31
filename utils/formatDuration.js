/**
 * Converts milliseconds to HH:MM:SS or MM:SS format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted time string
 */
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;
}

module.exports = formatDuration;
