import { ButtonInteraction, CacheType, Client } from "discord.js";

export type EventCallback = (
  cliente: Client,
  interaction: ButtonInteraction<CacheType>
) => Awaited<void>;
export type EventHandler = {
  name: string;
  handler: EventCallback;
};
