
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
        type: ApplicationCommandOptionType.String,
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
  {
    name:"viewtrades",
    description: "View your trades",
  },
  {
    name:"addcard",
    description: "Add a card to the database",
    options: [
      {
        name: "name",
        description: "The name of the card",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "set",
        description: "The set of the card",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "rarity",
        description: "The rarity of the card",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "image",
        description: "The image : )",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"addset",
    description: "Add a set to the database",
    options: [
      {
        name: "name", 
        description: "The name of the set",
        type: ApplicationCommandOptionType.String,
        required: true, 
      },
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"removecard",
    description: "Remove a card from the database",
    options: [
      {
        name: "name",
        description: "The name of the card to remove",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  }, 
  {
    name:"removeset",
    description: "Remove a set from the database",
    options: [
      {
        name: "name",
        description: "The name of the set to remove",
        type: ApplicationCommandOptionType.String,
        required: true,   
      }
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"givecard",
    description: "Give a card to a user",
    options: [
      {
        name: "user",
        description: "The user you want to give the card to",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "card", 
        description: "The card you want to give",
        type: ApplicationCommandOptionType.String,
        required: true,
      }, 
      {
        name: "amount",
        description: "The amount of cards you want to give",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }
    ]
  },
  {
    name:"removecarduser",
    description: "Remove a card from a user's collection",
    options: [
      {
        name: "user",
        description: "The user you want to remove the card from",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "card",
        description: "The card you want to remove",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "amount",
        description: "The amount of cards you want to remove",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }
    ]
  }


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