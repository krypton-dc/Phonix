const {
  ContainerBuilder,
  TextDisplayBuilder,
  MediaGalleryBuilder,
  SeparatorBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

class Box extends ContainerBuilder {
  constructor() {
    super();
  }

  text(content) {
    this.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    return this;
  }

  media(url) {
    this.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems([{ media: { url } }])
    );
    return this;
  }

  sep() {
    this.addSeparatorComponents(new SeparatorBuilder());
    return this;
  }

  button(label, style = ButtonStyle.Link, urlOrCustomId) {
    const btn = new ButtonBuilder().setLabel(label).setStyle(style);

    if (style === ButtonStyle.Link) {
      btn.setURL(urlOrCustomId);
    } else {
      btn.setCustomId(urlOrCustomId);
    }

    this.addActionRowComponents(btn);
    return this;
  }
}

module.exports = Box;
