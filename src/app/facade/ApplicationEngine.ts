import { CommandHandler } from "@app/contracts/command";
import { EventHandler } from "@app/contracts/events";
import {
  Client,
  GatewayIntentBits,
  Interaction,
  Partials,
  REST,
  Routes,
} from "discord.js";

import { existsSync, mkdir, mkdirSync, readdirSync } from "fs";
import { join, parse } from "path";
import { Console } from "./console";
import DiscordBot from "@app/contracts/bot";
import { presentation } from "./presentation";

class ApplicationEngine extends Client {
  private commands: CommandHandler[] = [];
  private events: EventHandler[] = [];
  private bots: DiscordBot[] = [];
  private commandsPath = join(__dirname, "../../commands/");
  private eventsPath = join(__dirname, "../../events/");
  private botsPath = join(__dirname, "../../bot/");
  public accessToken: string;

  constructor(token: string) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
    this.accessToken = token;
  }

  async start() {
    presentation();
    Console.log(`[🚀]:: Realizando login...`, "warning");
    await this.login(this.accessToken);
    await this.initializeBots();
    await this.loadEventsHandles();
    await this.loadCommands();

    Console.log(`Comandos carregados: ${this.commands.length}`, "info");
    console.log(
      `⚡ \x1b[92mMonster\x1b[94mZ \x1b[95mDiscord Bot Framework \x1b[97m\x1b[97miniciado com sucesso`
    );
  }

  public async loadCommands() {
    await this.importAllCommands();
  }
  private async importAllCommands() {
    Console.log("[🚀]:: Importando comandos", "warning");
    if (!existsSync(this.commandsPath))
      mkdirSync(this.commandsPath, { recursive: true });

    for (const handlerFile of readdirSync(this.commandsPath)) {
      const command = require(`${this.commandsPath}/${handlerFile}`)
        .default as CommandHandler;
      this.commands.push(command);
    }
  }
  private async importCommandsToGuild() {
    const api = new REST({ version: "9" }).setToken(this.accessToken);

    const commands = this.commands.map((command) => ({
      name: command.metadata.shortcut,
      description: command.metadata.descriptions,
    }));

    try {
      for (const guild of this.guilds.cache.toJSON()) {
        await api.put(Routes.applicationGuildCommands(this.user.id, guild.id), {
          body: commands,
        });
      }
    } catch (e) {
      console.log("Erro ao carregar os comandos: ", e);
    }
  }

  public async loadEventsHandles() {
    Console.log("[🚀]:: Importando eventos", "warning");
    await this.importAndLoadAllEvents();
    this.initializeNativeEvents();
  }
  private async importAndLoadAllEvents() {
    if (!existsSync(this.eventsPath))
      mkdirSync(this.eventsPath, { recursive: true });
    for (const handlerFile of readdirSync(this.eventsPath)) {
      const event = require(`${this.eventsPath}/${handlerFile}`)
        .default as EventHandler;
      this.events.push(event);
    }
  }
  private initializeNativeEvents() {
    this.on("ready", () => {
      console.log("ready");
    });
    this.importCommandsToGuild();
    this.on("interactionCreate", (interaction) => {
      if (interaction.isCommand()) {
        const commmand = this.commands.find(
          (command) => command.metadata.shortcut === interaction.commandName
        );

        if (commmand) {
          commmand.handler(this, interaction);
          return;
        }

        interaction.reply({
          content:
            "**Erro no comando**: Não foi possível localizar o comando no bot",
          ephemeral: true,
        });
        return;
      }

      if (interaction.isButton()) {
        const name = interaction.customId;
        const event = this.events.find((event) => event.name === name);

        if (event) {
          event.handler(this, interaction);
          return;
        }

        interaction.reply({
          content:
            "**Erro no evento**: Não foi possível localizar o evento no bot",
          ephemeral: true,
        });
      }
    });
  }

  private async initializeBots() {
    Console.log("[🤖]:: Preparando bots ", "warning");
    await this.registerAllBots();
    await this.bindBotCommands();
    await this.bindBotEvents();
  }
  private async registerAllBots() {
    for (const handlerFile of readdirSync(this.botsPath)) {
      const botClass = require(`${this.botsPath}/${handlerFile}`).default;
      const bot = new botClass() as DiscordBot;
      Console.log(`[🤖]:: Iniciando ->  ${bot.name}`, "especial");
      await bot.initialize(this);
      this.bots.push(bot);
    }
  }
  private async bindBotCommands() {
    for (const bot of this.bots) {
      this.commands.push(...bot.getCommands());
    }
  }
  private async bindBotEvents() {
    for (const bot of this.bots) {
      this.events.push(...bot.getEvents());
    }
  }
}

export default ApplicationEngine;
