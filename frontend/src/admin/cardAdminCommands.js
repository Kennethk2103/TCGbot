const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { Buffer } = require('buffer');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: 'config.env' });

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';

const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commandsUser = []

const commandMap = new Map();


const addCardSlash =  {
    name:"addcard",
    description: "Add a card to the database",
    options: [
      {
        name: "name",
        description: "I AM SAM. I AM SAM. SAM I AM.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "description",
        description: "THAT SAM-I-AM! THAT SAM-I-AM! I DO NOT LIKE THAT SAM-I-AM!",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "set",
        description: "DO WOULD YOU LIKE GREEN EGGS & HAM?",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "rarity",
        description: "I DO NOT LIKE THEM,SAM-I-AM. I DO NOT LIKE GREEN EGGS & HAM.",
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
        name: "front_image",
        description: "WOULD YOU LIKE THEM HERE OR THERE?",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      },
      {
        name: "back_image",
        description: "WOULD YOU LIKE THEM HERE OR THERE?",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      },
      {
        name: "artist",
        description: "I DO NOT LIKE GREEN EGGS & HAM. I DO NOT LIKE THEM, SAM-I-AM.",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name : "num_in_set",
        description: "WOULD YOU LIKE THEM IN A HOUSE? WOULD YOU LIKE THEN WITH A MOUSE?",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "bio",
        description: "I DO NOT LIKE THEM IN A HOUSE. I DO NOT LIKE THEM WITH A MOUSE. ",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
      ,
      {
        name: "power",
        description: "I DO NOT LIKE THEM HERE OR THERE. I DO NOT LIKE THEM ANYWHERE.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "speed",
        description: " I DO NOT LIKE GREEN EGGS & HAM. I DO NOT LIKE THEM, SAM-I-AM.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "special",
        description: "WOULD YOU EAT THEM IN A BOX? WOULD YOU EAT THEM WITH A FOX?",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  };
async function addCard(interaction) {

    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const rarity = interaction.options.getString("rarity");
    const set = interaction.options.getString("set");
    const artist = interaction.options.getString("artist");
    const numInSet = interaction.options.getInteger("num_in_set");
    const frontImage = interaction.options.getAttachment("front_image");
    const backImage = interaction.options.getAttachment("back_image");
    const bio = interaction.options.getString("bio");
    const power = interaction.options.getInteger("power");
    const speed = interaction.options.getInteger("speed");
    const special = interaction.options.getInteger("special");




    if (!name || !description || !rarity || !set || !frontImage  || !numInSet || !artist) {
        return interaction.reply({ content: "Please provide all required fields.", ephemeral: true });
    }


    //download the image
    const imageUrlFront = frontImage.url;
    const imageResponseFront = await axios.get(imageUrlFront, { responseType: 'arraybuffer' });
    const imageBufferFront = Buffer.from(imageResponseFront.data, 'binary').toString('base64');


    const imageUrlBack = backImage?.url;
    let imageBufferBack = null;
    if (backImage) {
        const imageResponseBack = await axios.get(imageUrlBack, { responseType: 'arraybuffer' });
        imageBufferBack = Buffer.from(imageResponseBack.data, 'binary').toString('base64');
    }

    const id = interaction.user.id;
    //send it to the backend to add the card
    try {
        

        const returnData = await axios.post(`${process.env.backendURL}/api/card/`, body = {
            Name: name,
            Subtitle: description,
            Rarity: rarity,
            SetRef: set,
            Num: numInSet,
            Artist: artist,
            callerID: id,
            Bio: bio,
            Power: power,
            Speed: speed,
            Special: special,
            Artwork: { data: imageBufferFront, contentType: frontImage.contentType },
            Backside: imageBufferBack ? { data: imageBufferBack, contentType: backImage.contentType } : null
        }
       );

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card added successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to add card.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error adding card:", error);
        return interaction.reply({ content: "An error occurred while adding the card.", ephemeral: true });
    }

}
commandsUser.push(addCardSlash);
commandMap.set(addCardSlash.name, addCard);

const editCardSlash =  {
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
        name: "newfront_image",
        description: "The new front image of the card",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
      {
        name: "newback_image",
        description: "The new back image of the card",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
      {
        name: "newartist",
        description: "The new artist of the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name : "newnum_in_set",
        description: "The new number in set of the card",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "newbio",
        description: "The new bio of the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "newpower",
        description: "The new power of the card (0-5)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "newspeed",
        description: "The new speed of the card (0-5)",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "newspecial",
        description: "The new special of the card",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      }
    ],
    permissionsRequired:[8] // Admin permission
  }
async function editCard(interaction) {
    const cardId = interaction.options.getString("cardid");
    const name = interaction.options.getString("newname");
    const description = interaction.options.getString("newdescription");
    const rarity = interaction.options.getString("newrarity");
    const set = interaction.options.getString("newset");

    const frontImage = interaction.options.getAttachment("newfront_image");
     const backImage = interaction.options.getAttachment("newback_image");
    const artist = interaction.options.getString("newartist");
    const numInSet = interaction.options.getInteger("newnum");
    const newBio = interaction.options.getString("newbio");
    const newPower = interaction.options.getInteger("newpower");
    const newSpeed = interaction.options.getInteger("newspeed");
    const newSpecial = interaction.options.getInteger("newspecial");

    if (!cardId) {
        return interaction.reply({ content: "Please provide the card ID.", ephemeral: true });
    }

    //send it to the backend to edit the card
    try {
        const returnData = await axios.put(`${process.env.backendURL}/api/card/edit`, {
            ID: cardId,
            Name: name,
            Subtitle: description,
            Rarity: rarity,
            SetRef: set,
            Num: numInSet,
            Artist: artist,
            Bio: newBio,
            Power: newPower,
            Speed: newSpeed,
            Special: newSpecial,
            Artwork: frontImage ? {
                data: (await axios.get(frontImage.url, { responseType: 'arraybuffer' })).data,
                contentType: frontImage.contentType
            } : undefined,
            Backside: backImage ? {
                data: (await axios.get(backImage.url, { responseType: 'arraybuffer' })).data,
                contentType: backImage.contentType
            } : undefined,
            callerID: interaction.user.id
            
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card edited successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to edit card.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error editing card:", error);
        return interaction.reply({ content: "An error occurred while editing the card.", ephemeral: true });
    }

}
commandsUser.push(editCardSlash);
commandMap.set(editCardSlash.name, editCard);


const deleteCardSlash =  {
    name:"deletecard",
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
  }
async function deleteCard(interaction) {
    const cardId = interaction.options.getString("id");

    if (!cardId) {
        return interaction.reply({ content: "Please provide the card ID.", ephemeral: true });
    }

    //send it to the backend to delete the card
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/card/`, {
            data: { cardID: cardId , callerID : interaction.user.id }
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card deleted successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to delete card.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error deleting card:", error);
        return interaction.reply({ content: "An error occurred while deleting the card.", ephemeral: true });
    }

}
commandsUser.push(deleteCardSlash);
commandMap.set(deleteCardSlash.name, deleteCard);

const removeCardFromSetSlash =  {
    name:"removecardfromset",
    description: "Remove a card from a set",
    options: [
      {
        name: "setid",
        description: "The ID of the set to remove the card from",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "cardid",
        description: "The ID of the card to remove from the set",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  }
async function removeCardFromSet(interaction) {
    const setId = interaction.options.getString("setid");
    const cardId = interaction.options.getString("cardid");

    if (!setId || !cardId) {
        return interaction.reply({ content: "Please provide both the set ID and card ID.", ephemeral: true });
    }

    //send it to the backend to remove the card from the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/remove`, { SetID: setId, CardID: cardId, callerID : interaction.user.id  });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card removed from set successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to remove card from set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error removing card from set:", error);
        return interaction.reply({ content: "An error occurred while removing the card from the set.", ephemeral: true });
    }
}
commandsUser.push(removeCardFromSetSlash);
commandMap.set(removeCardFromSetSlash.name, removeCardFromSet);


const addOrMoveCardToSetSlash =  {
    name:"addormovecardtoset",
    description: "Add or move a card to a set",
    options: [
      {
        name: "setno",
        description: "The set number of the set to add or move the card to",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "cardid",
        description: "The ID of the card to add or move to the set",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
};
async function addOrMoveCardToSet(interaction) {
    const setId = interaction.options.getString("setno");
    const cardId = interaction.options.getString("cardid");

    if (!setId || !cardId) {
        return interaction.reply({ content: "Please provide both the set ID and card ID.", ephemeral: true });
    }

    //send it to the backend to add or move the card to the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/card/move`, { setRef: setId, cardID: cardId, callerID : interaction.user.id });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card added or moved to set successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to add or move card to set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error adding or moving card to set:", error);
        return interaction.reply({ content: "An error occurred while adding or moving the card to the set.", ephemeral: true });
    }
}
commandsUser.push(addOrMoveCardToSetSlash);
commandMap.set(addOrMoveCardToSetSlash.name, addOrMoveCardToSet);

module.exports = {
    commandsAdminCard: commandsUser,
    commandAdminCardMap: commandMap
};


