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
            return `Set Name: ${set.Name}, Set No: ${set.SetNo}\n ${(set.cards.length!=0) ? "Cards \n " + set.cards.map(card => card.Name + " | " + card.Rarity + " | " + card.Num + " | Power " + card.Power + " | Speed " + card.Speed + " | Special : " + card.Special + " | ID : " + card.SearchID).join("\n") : "No cards in this set."}`;
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

module.exports = {
    commandsUserSet: commandsUser,
    commandUserSetMap: commandMap
};
