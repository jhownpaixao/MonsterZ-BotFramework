import DiscordBot from "@app/contracts/bot";
import { CommandCallback, CommandHandler } from "@app/contracts/command";
import { EventCallback, EventHandler } from "@app/contracts/events";
import BotLoggerFunctions from "@app/facade/bot/BotLoggerFunctions";
import createContentCard from "@utils/createContentCard";
import createEmbedCard from "@utils/createEmbedCard";
import { QuickDB } from "quick.db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  CategoryChannel,
  ChannelType,
  Client,
  Interaction,
  Message,
  TextChannel,
} from "discord.js";

class BaseRegistration extends BotLoggerFunctions implements DiscordBot {
  // ?Properties
  public name = "Base Registration";
  private commands: CommandHandler[] = [];
  private events: EventHandler[] = [];
  private client: Client;
  private variables = {
    baseRecordCategory: "1180687879748472872", // Categoria onde será criado o canal da solicitação
    baseRegistrationChannel: "1180688039962492969", //Canal para o usuário solicitar o registro
    baseRecordResultChannel: "1184113588391120896", // Canal que receberá os resultados de registro
    baseRecordEvaluationChannel: "1184113497446031410", //Canal para aprovação pelos admins
  };

  private resultChannel: TextChannel;
  private registrationChannel: TextChannel;
  private evaluationChannel: TextChannel;
  private categoryChannel: CategoryChannel;
  private database: QuickDB;

  // ?Native Contracts Handles
  getCommands = () => this.commands;
  getEvents = () => this.events;

  initialize = async (client: Client<boolean>) => {
    this.client = client;
    await this.initializeChannels();

    if (
      !this.categoryChannel ||
      !this.evaluationChannel ||
      !this.resultChannel ||
      !this.registrationChannel
    ) {
      this.report(
        "Erro ao carregar os canais. Por favor verifique as variaveis",
        "danger"
      );
      this.report("Encerrando bot...", "danger");
      return;
    }
    this.database = new QuickDB();
    this.register();
  };

  // #Commands Handles
  registrationCommand: CommandCallback = async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const card = createEmbedCard(
      {
        color: "Aqua",
        title: "Registro de bases",
        description:
          "Você vai precisar de uma print do mapa com a localização da base, em seguida clique no botão **Registrar minha base**",
      },
      [
        {
          style: ButtonStyle.Primary,
          label: "Registrar minha base",
          id: "base.registration.request",
        },
      ]
    );

    await interaction.deleteReply();
    await interaction.channel?.send(card);
    // !METODO DE APROVAÇÃO AINDA NÃO CONLCUIDO (BOTÃO APROVAR E REJEITAR)
  };

  // #Events Handles
  registrationEvent: EventCallback = async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let requestChannel = await this.getCachedTextChannelByTopic(
      interaction,
      interaction.user.id
    );

    if (requestChannel) {
      interaction.editReply(
        createContentCard("Você ja possuí uma solicitação ativa", [
          {
            label: "Acompanhar solicitação",
            url: `https://discordapp.com/channels/${interaction.guild.id}/${requestChannel.id}`,
            style: ButtonStyle.Link,
          },
        ])
      );
      return;
    }

    requestChannel = await this.eventCreateRequestChannel(interaction);

    await interaction.editReply(
      createContentCard(
        "Sua solicitação de registro de bases foi criada com sucesso, siga as instruções no canal indicado!!",
        [
          {
            label: "Acompanhar solicitação",
            url: `https://discordapp.com/channels/${interaction.guild.id}/${requestChannel.id}`,
            style: ButtonStyle.Link,
          },
        ]
      )
    );

    let message = await requestChannel.send(
      createEmbedCard({
        color: "Aqua",
        title: "Registro de Base",
        description: "Envie uma print da localização",
      })
    );

    const collector = requestChannel.createMessageCollector({
      filter: (m) => m.author.id === interaction.user.id,
    });

    collector.on("collect", async (msg) => {
      msg.delete();
      collector.stop();

      this.eventSendToEvaluationChannel(msg);

      const card = createEmbedCard({
        color: "Yellow",
        description: "```Status: PENDENTE```",
        title: "Registro de Base",
        imageUrl: msg.attachments.first().url,
        fields: [
          {
            name: "**Informações Adicionais:**",
            value: msg.content || "**Sem informações**",
          },
          {
            name: "**Solicitante:**",
            value: `<@${interaction.user.id}>`,
          },
        ],
      });

      const resultChannelMessage = await this.resultChannel.send(card);
      await this.database.set(interaction.user.id, resultChannelMessage.id);

      await message.edit(
        createEmbedCard({
          color: "Aqua",
          title: "Registro de Base",
          description:
            "> Obrigado pela sua colaboração. O resultado estará disponível em breve",
          footer: { text: `Esse canal será deletado em 30 segundos` },
        })
      );

      setTimeout(() => requestChannel.delete(), 30000);
    });
  };
  registrationAnalysisEvent: EventCallback = async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();

    const fields = interaction.message.embeds[0].fields;
    const attachment = interaction.message.embeds[0].image;

    const cardData = {
      color: "",
      description: "",
      result: "",
    };

    switch (interaction.customId) {
      case "base.registration.request.approve":
        cardData.color = "Green";
        cardData.description = "```O registro de base foi aprovado```";
        cardData.result = "APROVADO";
        break;

      case "base.registration.request.approve":
        cardData.color = "Red";
        cardData.description = "```O registro de base foi rejeitado```";
        cardData.result = "REJEITADO";
        break;
    }

    const card = createEmbedCard({
      color: cardData.color,
      description: cardData.description,
      title: "Resultado de Registro de Base",
      imageUrl: attachment.url,
      fields: [{ name: "**Informações Adicionais:**", value: "sss" }],
    });

    this.resultChannel.send(card);

    const approvalButton = new ButtonBuilder()
      .setCustomId("base.registration.request.approve")
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(true);
    const rejectButton = new ButtonBuilder()
      .setCustomId("base.registration.request.reject")
      .setLabel("Rejeitar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true);
    const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      approvalButton,
      rejectButton
    );

    await interaction.message.edit({ components: [buttonsRow] });
    const rMid = await this.database.get(interaction.user.id);
    const resultMessage = await this.resultChannel.messages.fetch(rMid);
    const newCard = createEmbedCard({
      color: cardData.color,
      description: "```Status: " + cardData.result + "```",
      title: "Registro de Base",
      imageUrl: resultMessage.attachments.first()?.url,
      fields: [
        {
          name: "**Informações Adicionais:**",
          value: resultMessage.content || "**Sem informações**",
        },
      ],
    });
    resultMessage.edit(newCard);
  };

  // ?Private utils functions
  private eventSendToEvaluationChannel = async (content: Message<boolean>) => {
    const attachment = content.attachments.first();

    await this.evaluationChannel.send(
      createEmbedCard(
        {
          color: "Yellow",
          title: "Solicitação de registro de base",
          imageUrl: attachment.url,
          fields: [
            { name: "**Informações Adicionais:**", value: content.channelId },
          ],
        },
        [
          {
            label: "Aprovar",
            style: ButtonStyle.Success,
            id: "base.registration.request.approve",
          },
          {
            label: "Reprovar",
            style: ButtonStyle.Danger,
            id: "base.registration.request.reject",
          },
        ]
      )
    );
  };
  private eventCreateRequestChannel = async (
    interaction: ButtonInteraction<CacheType>
  ) => {
    return await interaction.guild.channels.create({
      name: `registro-base-${interaction.user.displayName}`,
      topic: interaction.user.id,
      parent: this.variables.baseRecordCategory,
      rateLimitPerUser: 0,
      permissionOverwrites: [
        {
          id: interaction.guild?.id,
          deny: ["ViewChannel", "SendMessages", "AddReactions"],
        },
        {
          id: interaction.user?.id,
          allow: [
            "ViewChannel",
            "SendMessages",
            "AttachFiles",
            "EmbedLinks",
            "ReadMessageHistory",
          ],
        },
      ],
    });
  };
  private getCachedTextChannelByTopic = async (
    interaction: Interaction,
    topic: string
  ) => {
    return interaction.guild.channels.cache.find(
      (channel) =>
        channel.type == ChannelType.GuildText && channel.topic?.includes(topic)
    );
  };
  private getChannelById = async (id: string) => {
    try {
      const channel = await this.client.channels.fetch(id);
      if (channel.type != ChannelType.GuildText) return null;
      return channel;
    } catch (error) {
      return null;
    }
  };
  private getCategoryById = async (id: string) => {
    try {
      const channel = await this.client.channels.fetch(id);
      if (channel.type != ChannelType.GuildCategory) return null;

      return channel;
    } catch (error) {
      return null;
    }
  };
  private initializeChannels = async () => {
    this.resultChannel = await this.getChannelById(
      this.variables.baseRecordResultChannel
    );
    this.registrationChannel = await this.getChannelById(
      this.variables.baseRegistrationChannel
    );
    this.evaluationChannel = await this.getChannelById(
      this.variables.baseRecordEvaluationChannel
    );
    this.categoryChannel = await this.getCategoryById(
      this.variables.baseRecordCategory
    );
  };
  private register = () => {
    // ?Registrar comandos
    this.commands.push({
      metadata: {
        shortcut: "registro-base",
        descriptions: "Iniciar sistema de registro de bases",
      },
      handler: this.registrationCommand,
    });

    // ?Registrar eventos
    this.events.push(
      {
        name: "base.registration.request",
        handler: this.registrationEvent,
      },
      {
        name: "base.registration.request.reject",
        handler: this.registrationAnalysisEvent,
      },
      {
        name: "base.registration.request.approve",
        handler: this.registrationAnalysisEvent,
      }
    );

    this.report("Iniciado.", "success");
  };
}

export default BaseRegistration;
