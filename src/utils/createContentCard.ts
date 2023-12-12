import { BtnCardList } from "@app/contracts/utils";
import {
  ActionRowBuilder,
  ButtonBuilder
} from "discord.js";

const createContentCard = (content: string, buttons: BtnCardList = []) => {
  const components = [];
  const parsedBtns = [];

  for (const btn of buttons) {
    const builder = new ButtonBuilder().setStyle(btn.style).setLabel(btn.label);
    if (btn.url) builder.setURL(btn.url);
    if (btn.id) builder.setCustomId(btn.id);
    parsedBtns.push(builder);
  }

  if (parsedBtns.length > 0) {
    const actionBuilder = new ActionRowBuilder<ButtonBuilder>();

    for (const btn of parsedBtns) {
      actionBuilder.addComponents(btn);
    }
    components.push(actionBuilder);
  }

  return { content, components, ephemeral: true };
};

export default createContentCard;
