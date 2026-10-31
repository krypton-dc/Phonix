const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs").promises;
const axios = require("axios");

const fonts = [
  { file: "Ruthligos.ttf", family: "Ruthligos" },
  { file: "Hijrnotes.ttf", family: "Hijrnotes" },
  { file: "GreatDay.ttf", family: "GreatDay" },
  { file: "Signatra.ttf", family: "Signatra" },
  { file: "Bacalisties.ttf", family: "Bacalisties" },
  { file: "Cherolina.ttf", family: "Cherolina" },
  { file: "TheChairmanRegular.otf", family: "TheChairmanRegular" },
];

fonts.forEach(async (font) => {
  const fontPath = path.join(__dirname, `../../custom/fonts/${font.file}`);
  try {
    await fs.access(fontPath);
    registerFont(fontPath, { family: font.family });
  } catch {
    console.warn(`⚠️ Font file missing: ${font.file}`);
  }
});

module.exports = {
  name: "pfpmaker",
  aliases: ["pfp"],
  owner: true,
  category: "Fun",
  description: "Create a custom PFP with text overlay.",
  execute: async (message, args, client, prefix) => {
    if (!args[0]) {
      return message.reply({
        embeds: [
          new client.embed().d(
            `Please enter the text you want on your image.\nUsage: \`${prefix}pfpmaker YourName\` `
          ),
        ],
      });
    }

    const text = args.join(" ");
    let uploadedImage = null;
    let selectedFont = "Cherolina";

    const embed = new client.embed()
      .t("PFP Maker")
      .d("📸 Choose how to provide an image:")
      .d(`${client.user.username} PFP Maker`);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("upload_image")
        .setLabel("Upload Image")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("iamgee")
        .setLabel("Image by Bot")
        .setStyle(ButtonStyle.Secondary)
    );

    const dropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_font")
        .setPlaceholder("Select a font")
        .addOptions(
          fonts.map((font) => ({
            label: font.family,
            value: font.family,
          }))
        )
    );

    const msg = await message.reply({ embeds: [embed], components: [buttons] });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) return;

      if (interaction.isButton()) {
        if (interaction.customId === "upload_image") {
          await interaction.reply({
            content:
              "📸 Please upload your profile picture within the next 30 seconds.",
          });

          const filter = (msgg) =>
            msgg.author.id === message.author.id && msgg.attachments.size > 0;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });

          if (!collected.size) {
            return interaction.followUp({
              content: "⏳ Time ran out! Please try again.",
            });
          }

          const imageAttachment = collected.first().attachments.first();
          if (!imageAttachment.contentType.startsWith("image/")) {
            return interaction.followUp({
              content: "❌ Please upload a valid image.",
            });
          }

          uploadedImage = imageAttachment.url;

          await interaction.message.edit({
            embeds: [
              new client.embed()
                .setDescription("Image uploaded successfully!")
                .setImage(uploadedImage),
            ],
            components: [dropdown],
          });

          await interaction.deleteReply();
        } else if (interaction.customId === "iamgee") {
          const rainbow = [
            "https://i.imgur.com/fLrkNYe.jpg",
            "https://i.imgur.com/2RGC8qJ.jpg",
            "https://i.imgur.com/VnG1zRd.jpg",
            "https://i.imgur.com/A61Ikm1.jpg",
            "https://i.imgur.com/WWsVJkT.jpg",
            "https://i.imgur.com/tHZvkfW.jpg",
            "https://i.imgur.com/RYYymDz.jpg",
            "https://i.imgur.com/W4slAdm.jpg",
            "https://i.imgur.com/0wYdffr.jpg",
            "https://i.imgur.com/hikRe2f.png",
            "https://imgur.com/a/oVJTpdE.png",
            "https://i.imgur.com/fLrkNYe.jpg",
          ];
          const randomImage =
            rainbow[Math.floor(Math.random() * rainbow.length)];
          const me = randomImage;
          uploadedImage = me;

          await interaction.update({
            embeds: [new client.embed().d("Using default image!").img(me)],
            components: [dropdown],
          });
        }
      }

      if (interaction.isStringSelectMenu()) {
        if (!uploadedImage) {
          return interaction.reply({
            content: "❌ Please upload or select an image first.",
            ephemeral: true,
          });
        }

        await interaction.deferUpdate();
        selectedFont = interaction.values[0];

        try {
          const me = await interaction.message.edit({
            embeds: [
              new client.embed().setDescription(
                "🎨 Processing your custom image..."
              ),
            ],
            files: [],
          });

          const imagePath = `./temp_pfp.png`;
          const response = await axios.get(uploadedImage, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" },
          });

          await fs.writeFile(imagePath, response.data);

          const img = await loadImage(imagePath);
          const canvasSize = 512;
          const canvas = createCanvas(canvasSize, canvasSize);
          const ctx = canvas.getContext("2d");

          // Crop image to 1:1 (square)
          const imageSize = Math.min(img.width, img.height);
          const offsetX = (img.width - imageSize) / 2;
          const offsetY = (img.height - imageSize) / 2;

          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            imageSize,
            imageSize,
            0,
            0,
            canvasSize,
            canvasSize
          );

          // Black overlay
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          // Apply text
          ctx.font = `100px "${selectedFont}"`;
          ctx.textAlign = "center";
          ctx.fillStyle = "white";
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          ctx.shadowBlur = 15;
          ctx.fillText(text, canvasSize / 2, canvasSize - 135);

          // Watermark
          ctx.font = "20px Arial";
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.fillText("Phonix", 50, 50);

          const buffer = canvas.toBuffer("image/png");
          const attachment = new AttachmentBuilder(buffer, {
            name: "custom_pfp.png",
          });

          await me.edit({
            embeds: [
              new client.embed()
                .setDescription("Here is your custom PFP:")
                .setImage("attachment://custom_pfp.png"),
            ],
            files: [attachment],
          });

          // Delete temp image
          await fs.unlink(imagePath);
        } catch (error) {
          console.error(error);
          await interaction.followUp({
            content: "❌ An error occurred. Try again.",
            ephemeral: true,
          });
        }
      }
    });
  },
};
