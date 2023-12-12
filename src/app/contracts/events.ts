import {
  ButtonInteraction,
  CacheType,
  Client,
  ModalSubmitInteraction,
} from "discord.js";

export type EventCallback = (
  cliente: Client,
  interaction: ButtonInteraction<CacheType> | ModalSubmitInteraction<CacheType>
) => Awaited<void>;
export type EventHandler = {
  name: string;
  handler: EventCallback;
};
