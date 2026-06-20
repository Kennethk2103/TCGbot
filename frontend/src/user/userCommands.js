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

        // Fetching each card's data + having Discord render artwork can exceed the 3s
        // reply window, so defer up front and edit the reply once everything is ready.
        await interaction.deferReply();

        const response = await axios.post(`${backendUrl}/user/open`, { DiscordID: userId, setNo: set });
        console.log("Pack opened successfully:", response.data);

        if (!response.data.cards || !Array.isArray(response.data.cards)) {
            throw new Error("No cards received from the backend.");
        }

        const openedCardsIDArray = response.data.cards;
        const cards = []; // { embed, file } per opened card, kept index-aligned

        for (const cardId of openedCardsIDArray) {
            const cardResponse = await axios.get(`${backendUrl}/card/`, { params: { ID: cardId } });
            if(cardResponse.data.count < 1){
                console.warn(`Card with ID ${cardId} not found or has no cards.`);
                continue; // Skip if no cards found
            }
            console.log("Card data fetched: ", cardResponse.data);
            const cardData = cardResponse.data.cards[0];

            const details = `Rarity: ${cardData.Rarity}, Num : ${cardData.Num}, Power: ${cardData.Power}, Speed: ${cardData.Speed}, Special: ${cardData.Special}, ID: ${cardData.SearchID}`;

            const embed = new EmbedBuilder()
                .setTitle(cardData.Name)
                .setDescription(details);

            // Artwork lives on Nextcloud (see backend/models/card.js). We fetch the file and
            // send it as a real attachment rather than embed.setImage(url): Discord renders
            // GIFs in rich-embed images as a STATIC first frame, but an inline attachment
            // animates. Not referencing it in the embed keeps it as a standalone inline image.
            let file;
            if (cardData.Artwork?.downloadUrl) {
                const artResp = await axios.get(cardData.Artwork.downloadUrl, { responseType: 'arraybuffer' });
                const ext = (cardData.Artwork.contentType && cardData.Artwork.contentType.split('/')[1]) || 'png';
                file = new AttachmentBuilder(Buffer.from(artResp.data), { name: `${cardData.Name}.${ext}` });
            }

            cards.push({ embed, file });
        }

        if (cards.length === 0) {
            await interaction.editReply("No cards opened.");
            return;
        }

        // Send all cards in a single message (stats stacked, animated images in a gallery
        // below). Discord caps a message at 10 embeds and 10 attachments, so chunk by 10 in
        // the rare case a pack is larger; a normal pack is one message.
        const PER_MESSAGE = 10;
        for (let i = 0; i < cards.length; i += PER_MESSAGE) {
            const chunk = cards.slice(i, i + PER_MESSAGE);
            const embeds = chunk.map(c => c.embed);
            const files = chunk.map(c => c.file).filter(Boolean);
            if (i === 0) {
                await interaction.editReply({ content: "You opened a pack!", embeds, files });
            } else {
                await interaction.followUp({ embeds, files });
            }
        }

    }
    catch (error) {
        console.error("Error opening pack:", error);
        const backendMsg = error.response?.data?.message || "";
        const message = /no packs/i.test(backendMsg)
            ? "You have no packs to open!"
            : "An error occurred while opening the pack. " + (backendMsg ? `Details: ${backendMsg}` : "Please try again later.");
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(message);
        } else {
            await interaction.reply(message);
        }
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

