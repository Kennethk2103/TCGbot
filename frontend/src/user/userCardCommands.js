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
    description: "View a card from your inventory by ID or name",
    options: [
        {
            name: 'name',
            description: 'The name of the card (case insensitive, shows all matches)',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: 'cardid',
            description: 'The SearchID of the card',
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }
    ],
}
async function viewCard(interaction) {
    const cardId = interaction.options.getInteger('cardid');
    const cardName = interaction.options.getString('name');

    if (!cardId && !cardName) {
        return interaction.reply({ content: "Please provide either a card name or a card ID.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Fetch caller's inventory — filters to owned cards and gives us quantity.
        const inventoryResp = await axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: interaction.user.id } });
        const userCards = inventoryResp.data.cards || [];

        let matches;
        if (cardName) {
            const needle = cardName.toLowerCase();
            matches = userCards.filter(c => c.Name.toLowerCase().includes(needle));
        } else {
            matches = userCards.filter(c => String(c.SearchID) === String(cardId));
        }

        if (matches.length === 0) {
            return interaction.editReply({
                content: cardName
                    ? `You don't own any cards named "${cardName}".`
                    : "You don't own a card with that ID."
            });
        }

        const cards = [];
        for (const cardData of matches) {
            const details = [
                `**Subtitle:** ${cardData.Subtitle || '—'}`,
                `**Rarity:** ${cardData.Rarity}`,
                `**ID:** ${cardData.SearchID}  |  **Num:** ${cardData.Num}`,
                `**Power:** ${cardData.Power ?? '—'}  |  **Speed:** ${cardData.Speed ?? '—'}  |  **Special:** ${cardData.Special ?? '—'}`,
                `**Owned:** ${cardData.quantity}`,
            ].join('\n');

            const embed = new EmbedBuilder()
                .setTitle(cardData.Name)
                .setDescription(details);

            let file;
            if (cardData.Artwork?.downloadUrl) {
                const artResp = await axios.get(cardData.Artwork.downloadUrl, { responseType: 'arraybuffer' });
                const ext = (cardData.Artwork.contentType && cardData.Artwork.contentType.split('/')[1]) || 'png';
                file = new AttachmentBuilder(Buffer.from(artResp.data), { name: `${cardData.Name}.${ext}` });
            }
            cards.push({ embed, file });
        }

        const PER_MESSAGE = 10;
        for (let i = 0; i < cards.length; i += PER_MESSAGE) {
            const chunk = cards.slice(i, i + PER_MESSAGE);
            const embeds = chunk.map(c => c.embed);
            const files = chunk.map(c => c.file).filter(Boolean);
            if (i === 0) {
                await interaction.editReply({ embeds, files });
            } else {
                await interaction.followUp({ embeds, files, ephemeral: true });
            }
        }

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
