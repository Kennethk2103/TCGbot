const dotenv = require('dotenv');


dotenv.config({ path: './../config.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const token_discord = process.env.token_discord;
const SERVER_ID = process.env.SERVER_ID;

const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const {commandsUserCard, commandUserCardMap} = require('./user/userCardCommands');
const {commandsUserSet, commandUserSetMap} = require('./user/userSetCommands');
const {commandsUserTrade, commandUserTradeMap} = require('./user/userTradeCommands');
const {commandsUser, commandUserMap} = require('./user/userCommands');

const {commandsAdminCard, commandAdminCardMap} = require('./admin/cardAdminCommands');
const {commandsAdminSet, commandAdminSetMap} = require('./admin/setAdminCommands');
const {commandsAdminUser, commandAdminUserMap} = require('./admin/userAdminCommands');
const {adminTradeCommands, adminTradeCommandMap} = require('./admin/tradeAdminCommands');

//check for duplicate command names in between all command set
const commandArray = [commandsUserCard, commandsUserSet, commandsUserTrade, commandsUser, commandsAdminCard, commandsAdminSet, commandsAdminUser, adminTradeCommands];

for (let i = 0; i < commandArray.length; i++) {
    for (let j = i + 1; j < commandArray.length; j++) {
        const setA = commandArray[i];
        const setB = commandArray[j];
        const namesA = setA.map(cmd => cmd.name);
        const namesB = setB.map(cmd => cmd.name);
        const duplicates = namesA.filter(name => namesB.includes(name));
        if (duplicates.length > 0) {
            console.error(`Duplicate command names found between ${i} and ${j} command sets: ${duplicates.join(', ')}`);
        }
    }
}

const commands = [
  {
    name: 'ping',
    description: 'Pong!',
    permissionsRequired:[8]
  }
];

commands.push(...commandArray.flat());
console.log("Registering the following commands:");
commands.sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => console.log(`- ${cmd.name}`));


const rest = new REST({ version: '10' }).setToken(token_discord);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        CLIENT_ID,
        SERVER_ID
      ),
      { body: commands }
    );

    console.log('Slash commands were registered successfully!');
  } catch (error) {
    console.log(`There was an error: ${error}`);
  }
})();