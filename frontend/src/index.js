
const { REST, Client, IntentsBitField, Routes, Activity, ActivityType, italic, VoiceChannel, StringSelectMenuBuilder, time } = require('discord.js')

const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');



const dotenv = require('dotenv');

dotenv.config({ path: './../config.env' });

const token_discord = process.env.token_discord;

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildModeration] });

const rest = new REST({ version: '10' }).setToken(token_discord);

const {makeTradeRequestReply, openPack, viewCard, listCards, createUser, getAllSets} = require('./user/userCommands.js');

const { addCard,
    removeCard,
    deleteCard,
    addOrMoveCardToSet,
    removeCardFromSet,
    addSet,
    deleteSet,
    viewUserInventory,
    removeSet,
    editCard,
    giveCard,
    setAdmin
} = require('./admin/adminCommands.js');

client.login(token_discord);


client.on('ready', (c) => {
    console.log("Bot is online")
});



client.on('messageCreate', async (message) => {
    //you can log messages in here
});



process.on("SIGINT", () => {
    process.exit(0);

})

client.on('interactionCreate', (interaction) => {
    console.log("Interaction received: " + interaction)
    if (!interaction.isChatInputCommand()) return;
    //if interaction is slash commad


    //user commands
    if (interaction.commandName == 'ping') {
        return interaction.reply("Pong!");
    }

    if(interaction.commandName=="initalieze-account"){
        return createUser(interaction);

    }

    if (interaction.commandName == 'list') {
        return listCards(interaction);
    }

    if (interaction.commandName == 'makepin') {
        const pin = interaction.options.getString('pin');
        //todo

    }

    if (interaction.commandName == 'view') {
        //todo
        return viewCard(interaction);
    }

    if (interaction.commandName == 'open') {
        return openPack(interaction)
    }

    if (interaction.commandName == 'trade') {
        return makeTradeRequestReply(interaction);
    }

    if (interaction.commandName=="getallsets"){
        return getAllSets(interaction);
    }


    //admin commands

    if (interaction.commandName == 'addcard') {
        return addCard(interaction);
    }

    if (interaction.commandName == 'removecard') {
        return removeCard(interaction);
    }

    if (interaction.commandName == 'viewinventory') {
        return viewUserInventory(interaction);
    }

    if (interaction.commandName == 'addset') {
        return addSet(interaction);
    }

    if (interaction.commandName == 'removeset') {
        return removeSet(interaction);
    }

    if(interaction.commandName == 'setadmin'){
        return setAdmin(interaction);
    }

    
});















