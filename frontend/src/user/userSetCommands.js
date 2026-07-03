const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { Buffer } = require('buffer');
const fs = require('fs');

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';


const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commandsUser = []

const commandMap = new Map();

const getAllSetsSlash = {
    name: "get-all-sets",
    description: "Get a list of all available card sets",
    options: []
}
async function getAllSets(interaction){//dONE
    try {
        const response = await axios.get(`${backendUrl}/set/all`);
        console.log("Response from backend:", response.data);

        if (!response.data || !Array.isArray(response.data)) {
            console.error("Invalid response format:", response.data);
            await interaction.reply("An error occurred while fetching sets. Please try again later.");
            return;
        }
        const message = response.data.map(set => {
            return `Set Name: ${set.Name}, Set No: ${set.SetNo}\n ${(set.cards.length!=0) ? "Cards \n " + set.cards.map(card => card.Name + " | " + card.Rarity + " | " + card.Num + " | ID : " + card.SearchID).join("\n") : "No cards in this set."}`;
        })

        const textOutput = new TextDisplayBuilder().setContent(message.join("\n\n"));
        await interaction.reply({ components: [textOutput] , flags: 1 << 15 | 64});
    } catch (error) {
        console.error("Error fetching sets:", error);
        await interaction.reply("An error occurred while fetching sets.");
    }
}
commandMap.set(getAllSetsSlash.name, getAllSets);
commandsUser.push(getAllSetsSlash);

const viewSetSlash = {
    name: "view-set",
    description: "List all cards in a specific set",
    options: [
        {
            name: "name",
            description: "The name of the set",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "setno",
            description: "The set number",
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }
    ]
};
async function viewSet(interaction) {
    const name = interaction.options.getString("name");
    const setNo = interaction.options.getInteger("setno");

    if (!name && setNo === null) {
        return interaction.reply({ content: "Please provide either a set name or a set number.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const params = name ? { Name: name } : { SetNo: setNo };
        const response = await axios.get(`${backendUrl}/set/`, { params });
        const set = response.data;

        if (!set) {
            return interaction.editReply(`No set found.`);
        }

        const cards = set.cards || [];
        const header = `**${set.Name}** (Set #${set.SetNo}) — ${cards.length} card${cards.length === 1 ? '' : 's'}`;

        if (cards.length === 0) {
            return interaction.editReply(`${header}\nNo cards in this set yet.`);
        }

        const lines = cards
            .sort((a, b) => (a.Num ?? 0) - (b.Num ?? 0))
            .map(card => `#${card.Num} **${card.Name}** | ${card.Rarity} | ID: ${card.SearchID}`);

        // Chunk into <=1900-char messages to stay under Discord's limit.
        const chunks = [];
        let current = header;
        for (const line of lines) {
            if (current.length + line.length + 1 > 1900) {
                chunks.push(current);
                current = '';
            }
            current += '\n' + line;
        }
        if (current) chunks.push(current);

        await interaction.editReply({ content: chunks[0] });
        for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp({ content: chunks[i], ephemeral: true });
        }

    } catch (error) {
        console.error("Error fetching set:", error);
        const msg = error.response?.data?.message
            ? `Error: ${error.response.data.message}`
            : "An error occurred while fetching the set. Please try again later.";
        await interaction.editReply(msg);
    }
}
commandMap.set(viewSetSlash.name, viewSet);
commandsUser.push(viewSetSlash);

module.exports = {
    commandsUserSet: commandsUser,
    commandUserSetMap: commandMap
};
