const fs = require("node:fs");
const path = require("node:path");
function getProjectStats(
  dir,
  ignoreDirs = ["node_modules", ".git", ".cache", ".npm"],
  minThreshold = 450
) {
  const stats = {
    files: 0,
    folders: 0,
    totalLines: 0,
    minLines: Infinity,
    avgLines: 0,
  };

  function walk(directory) {
    let items;
    try {
      items = fs.readdirSync(directory, { withFileTypes: true });
    } catch (e) {
      console.error(`Cannot access directory: ${directory}`, e);
      return;
    }

    for (const item of items) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory() && ignoreDirs.includes(item.name)) {
        continue;
      }

      if (item.isDirectory()) {
        stats.folders++;
        walk(fullPath);
      } else if (item.isFile()) {
        stats.files++;
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const lineCount = content.split("\n").length;

          stats.totalLines += lineCount;
          if (lineCount < stats.minLines) stats.minLines = lineCount;
        } catch (e) {
          console.error(`Failed to read file: ${fullPath}`, e);
        }
      }
    }
  }

  walk(dir);

  if (stats.minLines === Infinity) stats.minLines = 0;
  stats.minLines = Math.max(stats.minLines, minThreshold);

  stats.avgLines =
    stats.files > 0 ? Math.round(stats.totalLines / stats.files) : 0;

  return stats;
}

module.exports = { getProjectStats };
