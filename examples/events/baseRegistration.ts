import { EventCallback } from "@app/contracts/events";
import createContentCard from "@utils/createContentCard";
import createEmbedCard from "@utils/createEmbedCard";
import { ButtonStyle, ChannelType, Client, Message } from "discord.js";

const variables = {
  baseRecordCategory: "1180687879748472872",
  baseRegistrationChannel: "1180927078439325716",
  baseRecordResultChannel: "1180688084510199900",
  baseRecordEvaluationChannel: "1180688378077909042",
};

const handler: EventCallback = async (client, interaction) => {
  let answers;

  await interaction.deferReply({ ephemeral: true });

  let requestChannel = interaction.guild.channels.cache.find(
    (channel) =>
      channel.type == ChannelType.GuildText &&
      channel.topic?.includes(interaction.user.id)
  );

  if (requestChannel) {
    await interaction.editReply(
      createContentCard("Você ja possuí uma solicitação ativa", [
        {
          id: "channel.active.34",
          label: "Acompanhar solicitação",
          url: `https://discordapp.com/channels/${interaction.guild.id}/${requestChannel.id}`,
          style: ButtonStyle.Link,
        },
      ])
    );
    return;
  }

  requestChannel = await interaction.guild.channels.create({
    name: `registro-base-${interaction.user.displayName}`,
    topic: interaction.user.id,
    parent: variables.baseRecordCategory,
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
    answers = msg;
    collector.stop();

    sendToEvaluationChannel(client, msg);

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

const sendToEvaluationChannel = async (
  client: Client,
  content: Message<boolean>
) => {
  const attachment = content.attachments.first();
  const resultsChannel = await client.channels.fetch(
    variables.baseRecordEvaluationChannel
  );
  if (resultsChannel.type != ChannelType.GuildText) {
    return;
  }

  await resultsChannel.send(
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
export default { name: "base.registration.request", handler };
