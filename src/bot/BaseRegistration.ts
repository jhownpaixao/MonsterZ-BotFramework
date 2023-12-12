import DiscordBot from "@app/contracts/bot";
import { CommandCallback, CommandHandler } from "@app/contracts/command";
import { EventCallback, EventHandler } from "@app/contracts/events";
import BotLoggerFunctions from "@app/facade/bot/BotLoggerFunctions";
import createContentCard from "@utils/createContentCard";
import createEmbedCard from "@utils/createEmbedCard";
import { QuickDB } from "quick.db";
import "dotenv/config";
import {
  APIEmbedField,
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
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputComponent,
  TextInputStyle,
} from "discord.js";

class BaseRegistration extends BotLoggerFunctions implements DiscordBot {
  // ?Properties
  public name = "Base Registration";
  private commands: CommandHandler[] = [];
  private events: EventHandler[] = [];
  private client: Client;
  private variables = {
    baseRecordCategory: process.env.baseRecordCategory, // Categoria onde será criado o canal da solicitação
    baseRegistrationChannel: process.env.baseRegistrationChannel, //Canal para o usuário solicitar o registro
    baseRecordResultChannel: process.env.baseRecordResultChannel, // Canal que receberá os resultados de registro
    baseRecordEvaluationChannel: process.env.baseRecordEvaluationChannel, //Canal para aprovação pelos admins
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
          "Para registrar sua base clique no botão abaixo\nUm novo canal será aberto para registro da sua base\nEnvie um print do **MAPA** para que a administração possa aprovar sua base\n\nLembre-se leia as regras de base antes de construir clicando aqui https://discord.com/channels/642908198868746240/1141534644798504970 \n\nApós o registro acompanhe o canal de aprovação para ver se sua base foi aprovada - https://discord.com/channels/642908198868746240/1180608039749955614 \n\nBom jogo!",
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
        description: "Envie uma print da localização da sua base (**PRINT DO MAPA**)",
      })
    );

    const collector = requestChannel.createMessageCollector({
      filter: (m) => m.author.id === interaction.user.id,
    });

    collector.on("collect", async (msg) => {

      if (!msg.attachments.first()) {
        this.report('Não consegui identificar a print', 'danger');

        await message.edit(
          createEmbedCard({
            color: "Red",
            title: "Registro de Base",
            description:
              "> Você precisa enviar um print do mapa com a localização da sua base",
            footer: { text: `Envie somente 1 print` },
          })
        );
        return;
      }
      msg.delete();
      collector.stop();
      const fields: APIEmbedField[] = [
        {
          name: "**Informações Adicionais:**",
          value: msg.content || "**Sem informações**",
        },
        {
          name: "**Solicitante:**",
          value: `<@${interaction.user.id}>`,
        },
      ];
      this.eventSendToEvaluationChannel(msg, fields);

      const card = createEmbedCard({
        color: "Yellow",
        description: "```Status: PENDENTE```",
        title: "Registro de Base",
        imageUrl: msg.attachments.first().url,
        fields,
      });

      const resultChannelMessage = await this.resultChannel.send(card);
      await this.database.set(interaction.user.id, resultChannelMessage.id);

      await message.edit(
        createEmbedCard({
          color: "Aqua",
          title: "Registro de Base",
          description:
            "> Obrigado por registrar sua base. O resultado estará disponível em breve",
          footer: { text: `Esse canal será deletado em 30 segundos` },
        })
      );

      setTimeout(() => requestChannel.delete(), 30000);
    });
  };
  registrationAnalysisEventApprove: EventCallback = async (
    client,
    interaction
  ) => {
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();

    const fields = interaction.message.embeds[0].fields;
    const attachment = interaction.message.embeds[0].image;

    const cardData = {
      color: "",
      description: "",
      result: "",
    };

    const card = createEmbedCard({
      color: "Green",
      description: "```STATUS: APROVADO```",
      title: "Resultado de Registro de Base",
      imageUrl: attachment.url,
      fields: fields,
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
    resultMessage.delete();
  };
  registrationAnalysisEventReject: EventCallback = async (
    client,
    interaction
  ) => {
    if (!interaction.isModalSubmit()) return;
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();

    const fields = interaction.message.embeds[0].fields;
    const attachment = interaction.message.embeds[0].image;

    const cardData = {
      color: "",
      description: "",
      result: "",
    };

    const card = createEmbedCard({
      color: "Red",
      description: cardData.description,
      title:
        "```STATUS: REJEITADO``` \n\n```Motivo: " +
        interaction.fields.getTextInputValue("motivo") +
        "```\n\n",
      imageUrl: attachment.url,
      fields: [...fields, { name: "\n\n", value: "\n" }],
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
    resultMessage.delete();
  };
  registrationAnalysisEventRejectModal: EventCallback = async (
    client,
    interaction
  ) => {
    if (!interaction.isButton()) return;
    const modal = new ModalBuilder()
      .setCustomId("base.registration.request.reject")
      .setTitle("Motivo da Rejeição");

    const textInput = new TextInputBuilder()
      .setCustomId("motivo")
      .setLabel("Qual o motivo da reprovação?")
      .setPlaceholder("Responda aqui")
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
      textInput
    );
    modal.addComponents(row);
    interaction.showModal(modal);
  };

  // ?Private utils functions
  private eventSendToEvaluationChannel = async (
    content: Message<boolean>,
    fields: APIEmbedField[]
  ) => {
    const attachment = content.attachments.first();

    await this.evaluationChannel.send(
      createEmbedCard(
        {
          color: "Yellow",
          title: "Solicitação de registro de base",
          imageUrl: attachment.url,
          fields,
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
            id: "base.registration.request.reject.modal",
          },
        ]
      )
    );
  };
  private eventCreateRequestChannel = async (
    interaction:
      | ButtonInteraction<CacheType>
      | ModalSubmitInteraction<CacheType>
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
        name: "base.registration.request.reject.modal",
        handler: this.registrationAnalysisEventRejectModal,
      },
      {
        name: "base.registration.request.reject",
        handler: this.registrationAnalysisEventReject,
      },
      {
        name: "base.registration.request.approve",
        handler: this.registrationAnalysisEventApprove,
      }
    );

    this.report("Iniciado.", "success");
  };
}

export default BaseRegistration;
