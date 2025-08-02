
const {CLIENT_ID, SERVER_ID, token_discord} = require('../config.json');


const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commands = [
  {
    name: 'ping',
    description: 'Pong!',
    permissionsRequired:[8]
  },

  {
    name:"list",
    description: "List all the cards you have",
  },
  {
    name:"makepin",
    description:"make a pin or somethin idk",
    options: [
      {
        name: "pin",
        description: "The pin you want to make",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ] 
  },
  {
    name:"view",
    description: "View a specific card",
    options: [
      {
        name: "card",
        description: "The card you want to view",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ]
  },
  {
    name:"open",
    description: "Open a pack of cards",
    options: [
      {
        name: "set",
        description: "The set you want to open",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }
    ]
  },
  {
    name:"trade",
    description: "Trade cards with another user",
    options: [
      {
        name: "user",
        description: "The user you want to trade with",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ]
  },


];

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