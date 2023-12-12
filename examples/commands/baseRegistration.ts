import { CommandCallback, CommandHandlerMetada } from "@app/contracts/command";
import createEmbedCard from "@utils/createEmbedCard";
import { ButtonStyle } from "discord.js";

const metadata: CommandHandlerMetada = {
  shortcut: "base-registration",
  descriptions: "Inicar o acesso à solicitação de novos registros",
};

const handler: CommandCallback = async (client, interaction) => {
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
};

export default { metadata, handler };
