const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { Buffer } = require('buffer');
const fs = require('fs');

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';

const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commandsUser = []

const commandMap = new Map();

const initaliezeAccountSlash= {
    name:"initalieze-account",
    description: "Create your account to start collecting cards!",
    options: [
        {
            name: 'pin',
            description: 'A 4 digit pin to secure your account',
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
}
/*
@Kennethk2103
Finished
*/
async function createUser(interaction) {// Done
    const pin = interaction.options.getString('pin');
    const discordId = interaction.user.id;
    const discordUsername = interaction.user.username;

    try {
        const response = await axios.post(`${backendUrl}/user/`, {
            Username: discordUsername,
            DiscordID: discordId,
            Pin: pin
        });
        console.log("Response from backend:", response);
        return await interaction.reply({content: `Account created successfully! Your Discord ID is ${discordId} and your pin is ${pin}.`, ephemeral: true});
    } catch (error) {
        console.error("Error creating user:", error);
        if(error.response.data?.message){
            return await interaction.reply({content: `Error creating account: ${error.response.data.message}`, ephemeral: true});
        }
        return await interaction.reply({content: "An error occurred while creating your account. Please try again later.", ephemeral: true});
    }
}
commandsUser.push(initaliezeAccountSlash);
commandMap.set(initaliezeAccountSlash.name, createUser);


const listCardsSlash= {
    name:"list-cards",
    description: "List all cards you own",
    options: [
    ],
}
async function listCards (interaction) {

    const userId = interaction.user.id;
    try{
        const userResponse = await axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: userId } });
        let userCards = userResponse.data.cards;
        console.log("User cards fetched: ", userCards);
        let outputList = "";
        if (!userCards || userCards.length === 0) {
            return await interaction.reply({content:"You do not own any cards yet.", ephemeral: true});
        }
        userCards.forEach(card => {
            outputList += `Card Name: ${card.Name}, Rarity: ${card.Rarity}, Quantity: ${card.quantity}\n`;
        });

        return await interaction.reply({ content: outputList, ephemeral: true });


    }catch(error){
        console.error("Error fetching user cards: ", error);
        await interaction.reply("Error fetching user cards. Please try again later.");
        return;
    }
    
}
commandMap.set(listCardsSlash.name, listCards);
commandsUser.push(listCardsSlash);

const openPackSlash= {
    name:"open-pack",
    description: "Open a card pack from a specific set",
    options: [
        {
            name: 'set',
            description: 'The Set number of the set you want to open a pack from',
            type: ApplicationCommandOptionType.Number,
            required: true,
        }
    ],
}
async function openPack (interaction) {
    try{
        const userId = interaction.user.id;
        const set = interaction.options.getNumber('set');

        const response = await axios.post(`${backendUrl}/user/open`, { DiscordID: userId, setNo: set });
            console.log("Pack opened successfully:", response.data);

        const openCardArray = []
        if (response.data.cards && Array.isArray(response.data.cards)) {
            
            const openedCardsIDArray = response.data.cards;

            for (const cardId of openedCardsIDArray) {
                const cardResponse = await axios.get(`${backendUrl}/card/`, { params: { ID: cardId } });
                if(cardResponse.data.count < 1){
                    console.warn(`Card with ID ${cardId} not found or has no cards.`);
                    continue; // Skip if no cards found
                }
                console.log("Card data fetched: ", cardResponse.data);
                const cardData = cardResponse.data.cards[0];
                openCardArray.push(`Card Name: ${cardData.Name}, Rarity: ${cardData.Rarity}, Num : ${cardData.Num}, Power: ${cardData.Power}, Speed: ${cardData.Speed}, Special: ${cardData.Special}, ID: ${cardData.SearchID}`);
            }
            
        } else {
            throw new Error("No cards received from the backend.");

        }
        const textoutput = "" + openCardArray.join("\n") || "No cards opened."
        // const textOutput = new TextDisplayBuilder().setContent(openCardArray.join("\n") || "No cards opened.")
        await interaction.reply(textoutput);

    }
    catch (error) {
        console.error("Error opening pack:", error);
        await interaction.reply("An error occurred while opening the pack. " + (error.response?.data?.message ? `Details: ${error.response.data.message}` : "Please try again later."));
    }
    
}
commandMap.set(openPackSlash.name, openPack);
commandsUser.push(openPackSlash);

const makePinSlash = {
    name: "makepin",
    description: "make a pin or somethin idk",
    options: [
      {
        name: "pin",
        description: "The pin you want to make",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ] 
  }
async function makePin(interaction) {
    const pin = interaction.options.getString("pin");
    const discordId = interaction.user.id;
  
    try {
        const response = await axios.post(`${backendUrl}/user/edit`, {
            DiscordID: discordId,
            pin: pin
        });

        if (response.data.success) {
            await interaction.reply("Pin created successfully!");
        } else {
            await interaction.reply(`Failed to create pin: ${response.data.message}`);
        }
    } catch (error) {
        console.error("Error creating pin:", error);
        await interaction.reply("An error occurred while creating the pin. Please try again later.");
    }
}
commandMap.set(makePinSlash.name, makePin);
commandsUser.push(makePinSlash);

module.exports = {
    commandsUser,
    commandUserMap: commandMap
};

