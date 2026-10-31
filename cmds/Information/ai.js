const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: `put your groq api key`, // keep in .env
});

module.exports = {
  name: "ai",
  aliases: ["ask", "chat"],
  category: "Information",
  description: "Talk with Groq AI.",
  cooldown: 5,

  execute: async (message, args, client) => {
    const prompt = args.join(" ");
    if (!prompt) {
      return message.reply("❌ Please provide a question or prompt!");
    }

    try {
      const thinking = await message.reply({
        content: "🤖 Thinking with Groq AI...",
      });

      // Call Groq AI
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
      });

      const aiResponse =
        completion.choices[0]?.message?.content ||
        "⚠️ Groq did not return a response.";

      // Build container with line-wise chunks
      const container = client.box();

      const chunks = aiResponse.match(/[\s\S]{1,1000}/g) || [];
      chunks.forEach((chunk, idx) => {
        container.text((idx === 0 ? "💡 **Response:**\n" : "") + chunk.trim());
      });
      container.sep();

      container.text(`- AI Powered By GROQ.`);
      // Buttons row
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ai-regenerate")
          .setLabel("🔄 Regenerate")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("ai-delete")
          .setLabel("🗑️ Delete")
          .setStyle(ButtonStyle.Danger)
      );

      container.addActionRowComponents(row);

      await thinking.edit({
        flags: MessageFlags.IsComponentsV2,
        content: "",
        components: [container],
      });

      // Collector for button interactions
      const collector = thinking.createMessageComponentCollector({
        time: 60_000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "ai-delete") {
          return i.message.delete().catch(() => {});
        }

        if (i.customId === "ai-regenerate") {
          await i.deferUpdate();

          const regen = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama3-8b-8192",
          });

          const regenResponse =
            regen.choices[0]?.message?.content || "⚠️ No new response.";

          const newContainer = client.box();

          const regenChunks = regenResponse.match(/[\s\S]{1,1000}/g) || [];
          regenChunks.forEach((chunk, idx) => {
            newContainer.text(
              (idx === 0 ? "💡 **Response:**\n" : "") + chunk.trim()
            );
          });
          newContainer.sep();

          newContainer.text(`- AI Powered By GROQ.`);
          newContainer.addActionRowComponents(row);

          await i.message.edit({
            flags: MessageFlags.IsComponentsV2,
            components: [newContainer],
          });
        }
      });
    } catch (err) {
      console.error(err);
      return message.reply("⚠️ Error while fetching AI response.");
    }
  },
};
