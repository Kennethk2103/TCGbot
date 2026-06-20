const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const { Buffer } = require('buffer');
const fs = require('fs');

const axios = require('axios');
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';

const commandsUser = []
const commandMap = new Map();

const viewCardSlash = {
    name: "view-card",
    description: "View details of a specific card by its ID",
    options: [
        {
            name: 'cardid',
            description: 'The ID of the card you want to view',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        }
    ],
}
async function viewCard (interaction) {// DONE
    const cardNum = interaction.options.getInteger('cardid');

    // Fetching the card + downloading its artwork can exceed Discord's 3s window, so defer.
    await interaction.deferReply({ ephemeral: true });

    try {
        const response = await axios.get(`${backendUrl}/card/discordCard/`, { params: { ID: cardNum} });
        const artwork = response.data.Artwork;
        const Name = response.data.Name;
        const Rarity = response.data.Rarity;
        const setNum = response.data.SetNo;
        const Num = response.data.Num;
        const artist = response.data.Artist;
        const subtitle = response.data.Subtitle;
        const id = response.data.SearchID;
        const power = response.data.Power;
        const speed = response.data.Speed;
        const special = response.data.Special;
        const cardDetails = `\`\`Card Name: ${Name}\nID: ${id}\nRarity: ${Rarity}\nSet Number: ${setNum}\nCard Number: ${Num}\nArtist: ${artist}\nSubtitle: ${subtitle}\nPower: ${power}\nSpeed: ${speed}\nSpecial: ${special}\n\`\``;

        const embed = new EmbedBuilder()
            .setTitle(Name)
            .setDescription(cardDetails);

        // Artwork lives on Nextcloud (see backend/models/card.js). We fetch the file and
        // send it as a real attachment rather than embed.setImage(url): Discord renders
        // GIFs in rich-embed images as a STATIC first frame, but an inline attachment
        // animates. The attachment is intentionally NOT referenced by the embed so it
        // renders/animates as a standalone inline image beneath the stats.
        const files = [];
        if (artwork?.downloadUrl) {
            const artResp = await axios.get(artwork.downloadUrl, { responseType: 'arraybuffer' });
            const ext = (artwork.contentType && artwork.contentType.split('/')[1]) || 'png';
            files.push(new AttachmentBuilder(Buffer.from(artResp.data), { name: `${Name}.${ext}` }));
        }

        await interaction.editReply({
            embeds: [embed],
            files
        });

    } catch (error) {
        console.error("Error fetching card details:", error);
        await interaction.editReply("An error occurred while fetching the card details. Please try again later.");
    }

}

commandMap.set(viewCardSlash.name, viewCard);
commandsUser.push(viewCardSlash);

module.exports = {
    commandsUserCard: commandsUser,
    commandUserCardMap: commandMap
};
