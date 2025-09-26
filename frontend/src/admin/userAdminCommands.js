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


const setAdminSlash = {
    name: "set-admin",
    description: "Set or remove a user as an admin (Admin only)",
    options: [
        {
            name: "user",
            description: "The user to set as admin",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "isadmin",
            description: "Set to true to make admin, false to remove admin",
            type: ApplicationCommandOptionType.Boolean,
            required: true,
        }
    ],
        permissionsRequired:[8]

}
async function setAdmin(interaction) {
    const userId = interaction.options.getUser("user").id;
    const isAdmin = interaction.options.getBoolean("isadmin");

    console.log("Setting admin status for user:", {
        userId,
        isAdmin
    });

    if (!userId || isAdmin === undefined) {
        return interaction.reply({ content: "Please provide the user ID and admin status.", ephemeral: true });
    }

    //send it to the backend to set the user as admin
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/user/admin`, { DiscordID: userId, TorF: (isAdmin) ? "true" : "false" });

        if (returnData.status === 200) {
            return interaction.reply({ content: `User ${isAdmin ? 'set as' : 'removed from'} admin successfully!`, ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to set admin status.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error setting admin status:", error);
        return interaction.reply({ content: "An error occurred while setting the admin status.", ephemeral: true });
    }
}
commandMap.set(setAdminSlash.name, setAdmin);
commandsUser.push(setAdminSlash);


const viewUserInventorySlash = {
    name: "view-users-inventory",
    description: "View a user's inventory (Admin only)",
    options: [
        {
            name: "user",
            description: "The user whose inventory you want to view",
            type: ApplicationCommandOptionType.User,
            required: true,
        }
    ],
    permissionsRequired:[8]
}
async function viewUserInventory(interaction) {
    const userId = interaction.options.getUser("user").id;

    try {
        const returnData = await axios.get(`${process.env.backendURL}/api/user/cards`, {
            params: { DiscordID: userId }
        });

        if (returnData.status === 200) {
            const inventory = returnData.data.cards;
            let inventoryMessage = "User Inventory:\n";
            if(inventory.length === 0) {
                inventoryMessage += "No cards in inventory.";
                return interaction.reply({ content: inventoryMessage, ephemeral: true });
            }
            inventory.forEach(item => {
                inventoryMessage += `- ${item.Name} | Rarity: ${item.Rarity} | Num: ${item.Num} | (ID: ${item.SearchID})\n`;
            });
            return interaction.reply({ content: inventoryMessage, ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to retrieve user inventory.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error retrieving user inventory:", error);
        return interaction.reply({ content: "An error occurred while retrieving user inventory.", ephemeral: true });
    }

}
commandMap.set(viewUserInventorySlash.name, viewUserInventory);
commandsUser.push(viewUserInventorySlash);

const giveUserCardSlash = {
    name: "give-user-card",
    description: "Give a card to a user (Admin only)",
    options: [
        {
            name: "user",
            description: "The user you want to give the card to",   
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "cardid",
            description: "The ID of the card you want to give",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
        permissionsRequired:[8]

}

async function giveUserCard(interaction) {
    const userId = interaction.options.getUser("user").id;
    const cardId = interaction.options.getString("cardid");
    const callerID = interaction.user.id;

    if (!userId || !cardId ) {
        return interaction.reply({ content: "Please provide the user ID, card ID, and amount.", ephemeral: true });
    }

    //send it to the backend to give the card to the user
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/user/addCard`, { DiscordID: userId, cardID: cardId, callerID : callerID  });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card given to user successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to give card to user.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error giving card to user:", error);
        return interaction.reply({ content: "An error occurred while giving the card to the user.", ephemeral: true });
    }
}
commandMap.set(giveUserCardSlash.name, giveUserCard);
commandsUser.push(giveUserCardSlash);

const removeUserCardSlash = {
    name: "remove-user-card",
    description: "Remove a card from a user (Admin only)",
    options: [
        {
            name: "user",
            description: "The user you want to remove the card from",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "cardid",
            description: "The ID of the card you want to remove",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
        permissionsRequired:[8]

}

async function removeUserCard(interaction) {
    const userId = interaction.options.getUser("user").id;
    const cardId = interaction.options.getString("cardid");
    const callerID = interaction.user.id;
    if (!userId || !cardId) {
        return interaction.reply({ content: "Please provide the user ID and card ID.", ephemeral: true });
    }

    //send it to the backend to remove the card from the user
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/user/removeCard`, { DiscordID: userId, cardID: cardId, callerID : callerID  });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card removed from user successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to remove card from user.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error removing card from user:", error);
        return interaction.reply({ content: "An error occurred while removing the card from the user." + error.response.data.message, ephemeral: true });
    }
}
commandMap.set(removeUserCardSlash.name, removeUserCard);
commandsUser.push(removeUserCardSlash);
module.exports = {
    commandsAdminUser: commandsUser,
    commandAdminUserMap: commandMap
};
