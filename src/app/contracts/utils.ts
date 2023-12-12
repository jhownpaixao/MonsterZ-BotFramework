import {
  APIEmbedField,
  ButtonStyle,
  ColorResolvable,
  EmbedFooterOptions,
  RestOrArray,
} from "discord.js";

export type BtnCard = {
  style: ButtonStyle;
  label: string;
  id?: string;
  url?: string;
};

export type BtnCardList = BtnCard[];

export type BodyCard = {
  color: ColorResolvable;
  title?: string;
  description?: string;
  footer?: EmbedFooterOptions;
  fields?: APIEmbedField[];
  imageUrl?: string;
};
