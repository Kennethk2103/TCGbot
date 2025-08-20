const dotenv = require('dotenv');


dotenv.config({ path: './../config.env' });

const CLIENT_ID = process.env.CLIENT_ID;
const token_discord = process.env.token_discord;
const SERVER_ID = process.env.SERVER_ID;

const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commands = [
  {
    name: 'ping',
    description: 'Pong!',
    permissionsRequired:[8]
  },
  {
    name:"initalieze-account",
    description: "Initalieze your account",
    options: [
      {
        name:"pin",
        description: "The pin you want to use for your account",
        type: ApplicationCommandOptionType.String,
        required: true, 
      }
    ],
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
        name: "cardnumber",
        description: "The card number you want to view",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "setnumber",
        description: "The set the card belongs to",
        type: ApplicationCommandOptionType.Integer,
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
        type: ApplicationCommandOptionType.Number,
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
    name:"getallsets",
    description: "Get all sets",
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
        name: "description",
        description: "The description of the card",
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
        choices: [
                {
                    "name": "Common",
                    "value": "Common"
                },
                {
                    "name": "Rare",
                    "value": "Rare"
                },
                {
                    "name": "Ultra Rare",
                    "value": "Ultra Rare"
                }
            ]
        ,
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      
      {
        name: "image",
        description: "The image : )",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      },
      {
        name: "artist",
        description: "The artist of the card",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name : "num_in_set",
        description: "The number of the card in the set",
        type: ApplicationCommandOptionType.Integer,
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
      {
        name: "setno",
        description: "The set number of the set",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"removecard",
    description: "Remove a card from the database",
    options: [
      {
        name: "id",
        description: "The ID of the card to remove",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  }, 
  {
    name:"editcard",
    description: "Edit a card in the database",
    options: [
      {
        name: "cardid",
        description: "The ID of the card to edit",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "name",
        description: "The name of the card to edit",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "newname",
        description: "The new name of the card",  
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name:"newdescription",
        description: "The new description of the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "newset",
        description: "The new set of the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "newrarity",
        description: "The new rarity of the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "newimage",
        description: "The new image of the card",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      }
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"removeset",
    description: "Remove a set from the database",
    options: [
      {
        name: "id",
        description: "The ID of the set to remove",
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
        name: "cardid", 
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
  },
  {
    name:"viewusersinventory",
    description: "View a user's inventory",
    options: [
      {
        name: "user",
        description: "The user whose inventory you want to view",
        type: ApplicationCommandOptionType.User,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  },
  {
    name:"setadmin",
    description: "Set a user as an admin",
    options: [
      {
        name: "user",
        description: "The user you want to set as an admin",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "isadmin",
        description: "Whether the user is an admin or not",
        type: ApplicationCommandOptionType.Boolean,
        required: true,
      }

    ],
    permissionsRequired:[8] // Admin permission
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