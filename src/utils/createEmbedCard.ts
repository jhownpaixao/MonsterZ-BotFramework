import { BodyCard, BtnCardList } from "@app/contracts/utils";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";

const createEmbedCard = (
  body: BodyCard | string,
  buttons: BtnCardList = []
) => {
  const result: Record<string, any> = {};
  const embeds = [];
  const components = [];
  const parsedBtns = [];

  if (typeof body === "string") {
    result["content"] = body;
  } else {
    const embed = new EmbedBuilder().setColor(body.color).setTimestamp();
    
    if (body.title) embed.setTitle(body.title);
    if (body.description) embed.setDescription(body.description);
    if (body.footer) embed.setFooter(body.footer);
    if (body.fields) embed.addFields(body.fields);
    if (body.imageUrl) embed.setImage(body.imageUrl);
    embeds.push(embed);

    result["embeds"] = embeds;
  }

  for (const btn of buttons) {
    const builder = new ButtonBuilder()
      .setStyle(btn.style)
      .setLabel(btn.label)
      .setCustomId(btn.id);

    if (btn.url) builder.setURL(btn.url);
    parsedBtns.push(builder);
  }

  if (parsedBtns.length > 0) {
    const actionBuilder = new ActionRowBuilder<ButtonBuilder>();

    for (const btn of parsedBtns) {
      actionBuilder.addComponents(btn);
    }
    components.push(actionBuilder);
  }

  return { embeds, components };
};

export default createEmbedCard;
