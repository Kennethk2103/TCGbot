const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { Buffer } = require('buffer');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: 'config.env' });

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';

const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commandsUser = []

const commandMap = new Map();


const addSetSlash = {
    name: "add-set",
    description: "Add a new card set (Admin only)",
    options: [
        {
            name: "name",
            description: "The name of the set",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "setno",
            description: "The set number",
            type: ApplicationCommandOptionType.Integer,
            required: true,
        }
    ],
    permissionsRequired:[8]

}
/*
@Kennethk2103
Finished
*/
async function addSet(interaction) {
    const name = interaction.options.getString("name");
    const setNo = interaction.options.getInteger("setno");
    const DiscordID = interaction.user.id;

    if (!name || !setNo) {
        return interaction.reply({ content: "Please provide both the name and set number.", ephemeral: true });
    }

    //send it to the backend to add the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/`, { Name: name, SetNo: setNo, callerID : DiscordID });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Set added successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to add set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error adding set:", error);
        return interaction.reply({ content: "An error occurred while adding the set. " + error.response.data.message, ephemeral: true });
    }
}
commandMap.set(addSetSlash.name, addSet);
commandsUser.push(addSetSlash);

const deleteSetSlash = {
    name: "delete-set",
    description: "Delete a card set (Admin only)",
    options: [
        {
            name: "setid",
            description: "The ID of the set to delete",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    permissionsRequired:[8]

    
}
async function deleteSet(interaction) {
    const setId = interaction.options.getString("setid");
    const DiscordID = interaction.user.id;

    if (!setId) {
        return interaction.reply({ content: "Please provide the set ID.", ephemeral: true });
    }

    //send it to the backend to delete the set
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/set/`, {
            data: { ID: setId, callerID : DiscordID }
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Set deleted successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to delete set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error deleting set:", error);
        return interaction.reply({ content: "An error occurred while deleting the set. " + error.response.data.message, ephemeral: true });
    }

}
commandMap.set(deleteSetSlash.name, deleteSet);
commandsUser.push(deleteSetSlash);


const editSetSlash = {
    name: "edit-set",
    description: "Edit a card set (Admin only)",
    options: [
        {
            name: "currentSetNo",
            description: "The ID of the set to edit",
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
        {
            name: "newName",
            description: "The new name of the set",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: "newSetNo",
            description: "The new set number",
            type: ApplicationCommandOptionType.Integer,
            required: false,
        }
    ],
    permissionsRequired:[8]
}
async function editSet(interaction) {
    const currentSetNo = interaction.options.getInteger("currentSetNo");
    const newName = interaction.options.getString("newName");
    const newSetNo = interaction.options.getInteger("newSetNo");
    const DiscordID = interaction.user.id;

    if (!currentSetNo) {
        return interaction.reply({ content: "Please provide the current set number.", ephemeral: true });
    }

    if (!newName && !newSetNo) {
        return interaction.reply({ content: "Please provide at least one field to update (new name or new set number).", ephemeral: true });
    }

    //send it to the backend to edit the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/edit`, { prevSetNo: currentSetNo, Name: newName, SetNo: newSetNo, callerID : DiscordID });


module.exports = {
    commandsAdminSet: commandsUser,
    commandAdminSetMap: commandMap
};
