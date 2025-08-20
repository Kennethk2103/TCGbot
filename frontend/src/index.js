
const { REST, Client, IntentsBitField, Routes, Activity, ActivityType, italic, VoiceChannel, StringSelectMenuBuilder, time } = require('discord.js')

const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');



const dotenv = require('dotenv');

dotenv.config({ path: './../config.env' });

const token_discord = process.env.token_discord;

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildModeration] });

const rest = new REST({ version: '10' }).setToken(token_discord);

const {makeTradeRequestReply, openPack, viewCard, listCards} = require('./user/userCommands.js');

const { addCard, removeCard, viewUserInventory, addset } = require('./admin/adminCommands.js');

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


    //admin commands









    


});





