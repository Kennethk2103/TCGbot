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

    try {
        const response = await axios.get(`${backendUrl}/card/discordCard/`, { params: { ID: cardNum} });
        const artwork = response.data.Artwork;
        const backside = response.data.Backside;
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
        const text = new TextDisplayBuilder().setContent(cardDetails)
        //check if the directory exists, if not create it
        if (!fs.existsSync('./temp')) {
            fs.mkdirSync('./temp');
        }

        //GET TYPE OF IMAGE
        const imageTypeFront = artwork.contentType;
        //generate image from base 64 buffer
        const imageBufferFront = Buffer.from(artwork.data, 'base64');
        //save the image to a temp file
        fs.writeFileSync(`./temp/${Name}.${imageTypeFront.split("/")[1]}`, imageBufferFront);

        const imageTypeBack = backside.contentType;
        //generate image from base 64 buffer
        const imageBufferBack = Buffer.from(backside.data, 'base64');
        //save the image to a temp file
        fs.writeFileSync(`./temp/${Name}_back.${imageTypeBack.split("/")[1]}`, imageBufferBack);    

        await interaction.reply({
            content: cardDetails,
            files : [`./temp/${Name}.${imageTypeFront.split("/")[1]}`, `./temp/${Name}_back.${imageTypeBack.split("/")[1]}`],
            ephemeral: true
        });

        // Clean up the temporary file after sending the reply
        setTimeout(() => {
            fs.unlinkSync(`./temp/${Name}.${imageTypeFront.split("/")[1]}`);
            fs.unlinkSync(`./temp/${Name}_back.${imageTypeBack.split("/")[1]}`);
        }, 5000); // Adjust the timeout as needed

    } catch (error) {
        console.error("Error fetching card details:", error);
        await interaction.reply("An error occurred while fetching the card details. Please try again later.");
    }

}

commandMap.set(viewCardSlash.name, viewCard);
commandsUser.push(viewCardSlash);

module.exports = {
    commandsUserCard: commandsUser,
    commandUserCardMap: commandMap
};
