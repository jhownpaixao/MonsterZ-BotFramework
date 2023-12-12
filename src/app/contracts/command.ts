import {
  Awaitable,
  CacheType,
  Client,
  ClientEvents,
  CommandInteraction,
} from "discord.js";

export type CommandCallback = (
  client: Client,
  interaction: CommandInteraction<CacheType>
) => Awaitable<void>;

export type CommandHandlerMetada = {
  shortcut: string;
  descriptions: string;
};

export type CommandHandler = {
  metadata: CommandHandlerMetada;
  handler: CommandCallback;
};

export type MapedCommandHandler<Event extends keyof ClientEvents> = (
  cliente: Client,
  ...args: ClientEvents[Event]
) => Awaitable<void>;
