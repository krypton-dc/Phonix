const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const archiver = require("archiver");
const path = require("path");

module.exports = {
  name: "backup",
  category: "Owner",
  aliases: ["backupbot", "backup-gen"],
  description: "Create a backup of the bot's files",
  args: false,
  cooldown: 20,
  usage: "",
  owner: true,
  execute: async (message, args, client, prefix) => {
    const backupDir = path.join(__dirname, "backup");
    const outputFilePath = path.join(backupDir, "Phonix.zip");
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
    } catch (err) {
      console.error("Error creating backup directory:", err);
      return message.reply({
        content:
          "Failed to create backup directory. Check the bot logs for more details.",
      });
    }

    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", async () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log(
        "Backup has been finalized and the output file descriptor has closed."
      );

      try {
        const user = await client.users.fetch(client.owner);
        await user.send({
          content: "Backup created successfully!",
          files: [outputFilePath],
        });
        await message.channel.send({
          content: "Backup has been sent to your DMs!",
        });
      } catch (err) {
        console.error("Error sending DM:", err);
        message.channel.send({
          content:
            "Failed to send backup to your DMs. Please check the bot logs.",
        });
      }
    });

    // Handle archive warnings and errors
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") {
        console.error("Warning during archive creation:", err);
      }
    });

    archive.on("error", (err) => {
      console.error("Error during archive creation:", err);
      return message.reply({
        content:
          "An error occurred while creating the backup. Check the bot logs for details.",
      });
    });

    // Start archiving
    archive.pipe(output);
    archive.glob("**/*", {
      cwd: path.join(__dirname, "../../"), // Adjust this to the correct base directory for your bot files
      dot: true,
      ignore: [
        "node_modules/**",
        ".cache/**",
        ".npm/**",
        ".config/**",
        "package-lock.json",
        "fonts/**",
      ],
    });

    try {
      await archive.finalize();
      message.reply({
        content:
          "Backup is being created. You will be notified once it's complete.",
      });
    } catch (err) {
      console.error("Error finalizing the archive:", err);
      message.reply({
        content:
          "Failed to finalize the backup. Check the bot logs for details.",
      });
    }
  },
};
