
const { REST, Client, IntentsBitField, Routes, Activity, ActivityType, italic, VoiceChannel, StringSelectMenuBuilder, time } = require('discord.js')

const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');



const dotenv = require('dotenv');

dotenv.config({ path: './../config.env' });

const token_discord = process.env.token_discord;

const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildModeration] });

const rest = new REST({ version: '10' }).setToken(token_discord);

const {commandsUserCard, commandUserCardMap} = require('./user/userCardCommands');
const {commandsUserSet, commandUserSetMap} = require('./user/userSetCommands');
const {commandsUserTrade, commandUserTradeMap} = require('./user/userTradeCommands');
const {commandsUser, commandUserMap} = require('./user/userCommands');

const {commandsAdminCard, commandAdminCardMap} = require('./admin/cardAdminCommands');
const {commandsAdminSet, commandAdminSetMap} = require('./admin/setAdminCommands');
const {commandsAdminUser, commandAdminUserMap} = require('./admin/userAdminCommands');
const {adminTradeCommands, adminTradeCommandMap} = require('./admin/tradeAdminCommands');

client.login(token_discord);

//merge all command maps
const commandMap = new Map([...commandUserCardMap, ...commandUserSetMap, ...commandUserTradeMap, ...commandUserMap, ...commandAdminCardMap, ...commandAdminSetMap, ...commandAdminUserMap, ...adminTradeCommandMap]);


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
    else if (commandMap.has(interaction.commandName)) {
        const commandFunction = commandMap.get(interaction.commandName);
        commandFunction(interaction);
    }
    else {
        return interaction.reply("Command not initialized yet");
    }


    
});
