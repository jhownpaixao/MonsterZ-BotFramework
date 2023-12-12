import { Client } from "discord.js";
import { CommandHandler } from "./command";
import { EventHandler } from "./events";

interface DiscordBot {
  name: string;
  getCommands: () => CommandHandler[];
  getEvents: () => EventHandler[];
  initialize: (client: Client) => Promise<void>;
}

export default DiscordBot;
