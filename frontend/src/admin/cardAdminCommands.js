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


// Inputs mirror the addMany CSV columns: Name, Subtitle, Rarity, Num, setRef,
// ArtworkFile, Power, Speed, Special. (set is optional, like setRef in the CSV.)
// Discord requires all required options before optional ones, so "set" comes last.
const addCardSlash =  {
    name:"addcard",
    description: "Add a card to the database",
    options: [
      {
        name: "name",
        description: "The card's name",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "subtitle",
        description: "The card's subtitle",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "rarity",
        description: "The card's rarity",
        choices: [
                { "name": "Common", "value": "Common" },
                { "name": "Rare", "value": "Rare" },
                { "name": "Ultra Rare", "value": "Ultra Rare" }
            ],
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "num",
        description: "The card's number within its set",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "artwork",
        description: "The card artwork (.png, .jpg, .gif, .webp)",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      },
      {
        name: "power",
        description: "The card's Power stat",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "speed",
        description: "The card's Speed stat",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "special",
        description: "The card's Special stat",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: "set",
        description: "The set number to add the card to",
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
  };
async function addCard(interaction) {
    const name = interaction.options.getString("name");
    const subtitle = interaction.options.getString("subtitle");
    const rarity = interaction.options.getString("rarity");
    const num = interaction.options.getInteger("num");
    const artwork = interaction.options.getAttachment("artwork");
    const power = interaction.options.getInteger("power");
    const speed = interaction.options.getInteger("speed");
    const special = interaction.options.getInteger("special");
    const set = interaction.options.getString("set");

    if (!name || !subtitle || !rarity || num === null || !artwork) {
        return interaction.reply({ content: "Please provide all required fields.", ephemeral: true });
    }

    // Downloading the artwork + the backend's Nextcloud upload can exceed Discord's 3s window.
    await interaction.deferReply({ ephemeral: true });

    try {
        // Download the artwork from Discord and forward it to the backend as base64.
        const imageResponse = await axios.get(artwork.url, { responseType: 'arraybuffer' });
        const artworkBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');

        const returnData = await axios.post(`${backendUrl}/card/`, {
            Name: name,
            Subtitle: subtitle,
            Rarity: rarity,
            Num: num,
            SetRef: set,
            Power: power,
            Speed: speed,
            Special: special,
            callerID: interaction.user.id,
            // originalName carries the file extension so the backend/Nextcloud derive a
            // valid image mime type (e.g. image/gif) instead of application/octet-stream,
            // which both passes the Artwork.contentType enum and lets Discord render it.
            Artwork: { data: artworkBase64, contentType: artwork.contentType, originalName: artwork.name },
        });

        if (returnData.status === 200) {
            return interaction.editReply({ content: `Card added successfully! ID: ${returnData.data.cardID}` });
        }
        return interaction.editReply({ content: "Failed to add card." });
    } catch (error) {
        console.error("Error adding card:", error);
        const details = error.response?.data?.message ? ` Details: ${error.response.data.message}` : "";
        return interaction.editReply({ content: "An error occurred while adding the card." + details });
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
        description: "The SearchID of the card to edit",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "name",
        description: "New name for the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "subtitle",
        description: "New subtitle for the card",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "rarity",
        description: "New rarity for the card",
        choices: [
                { "name": "Common", "value": "Common" },
                { "name": "Rare", "value": "Rare" },
                { "name": "Ultra Rare", "value": "Ultra Rare" }
            ],
        type: ApplicationCommandOptionType.String,
        required: false,
      },
      {
        name: "num",
        description: "New number within the set",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "artwork",
        description: "New artwork (.png, .jpg, .gif, .webp)",
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
      {
        name: "power",
        description: "New Power stat",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "speed",
        description: "New Speed stat",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "special",
        description: "New Special stat",
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
      {
        name: "set",
        description: "Set number to move the card to",
        type: ApplicationCommandOptionType.String,
        required: false,
      }
    ],
    permissionsRequired:[8] // Admin permission
  }
async function editCard(interaction) {
    const cardId = interaction.options.getString("cardid");
    const name = interaction.options.getString("name");
    const subtitle = interaction.options.getString("subtitle");
    const rarity = interaction.options.getString("rarity");
    const num = interaction.options.getInteger("num");
    const artwork = interaction.options.getAttachment("artwork");
    const power = interaction.options.getInteger("power");
    const speed = interaction.options.getInteger("speed");
    const special = interaction.options.getInteger("special");
    const set = interaction.options.getString("set");

    await interaction.deferReply({ ephemeral: true });

    try {
        const body = {
            ID: cardId,
            callerID: interaction.user.id,
        };

        if (name !== null) body.Name = name;
        if (subtitle !== null) body.Subtitle = subtitle;
        if (rarity !== null) body.Rarity = rarity;
        if (num !== null) body.Num = num;
        if (power !== null) body.Power = power;
        if (speed !== null) body.Speed = speed;
        if (special !== null) body.Special = special;
        if (set !== null) body.SetRef = set;

        if (artwork) {
            const imageResponse = await axios.get(artwork.url, { responseType: 'arraybuffer' });
            const artworkBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');
            body.Artwork = { data: artworkBase64, contentType: artwork.contentType, originalName: artwork.name };
        }

        const returnData = await axios.post(`${backendUrl}/card/edit`, body);

        if (returnData.status === 200) {
            return interaction.editReply({ content: "Card edited successfully!" });
        }
        return interaction.editReply({ content: "Failed to edit card." });
    } catch (error) {
        console.error("Error editing card:", error);
        const details = error.response?.data?.message ? ` Details: ${error.response.data.message}` : "";
        return interaction.editReply({ content: "An error occurred while editing the card." + details });
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


// ─────────────────────────────────────────────────────────────────────────────
// Command written by Claude (Opus 4.8).
// Bulk-uploads cards from a single .zip (containing metadata.csv + an images/
// folder) to the backend's POST /api/card/many endpoint, which expects a
// multipart/form-data field named "Zipfile". See backend/uploadManyExample/.
// ─────────────────────────────────────────────────────────────────────────────
const addManySlash = {
    name: "addmany",
    description: "Bulk upload cards from a zip (metadata.csv + images/ folder)",
    options: [
      {
        name: "zipfile",
        description: "A .zip containing metadata.csv and an images/ folder",
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      }
    ],
    permissionsRequired:[8] // Admin permission
};
async function addMany(interaction) {
    const zipAttachment = interaction.options.getAttachment("zipfile");

    if (!zipAttachment) {
        return interaction.reply({ content: "Please attach a .zip file.", ephemeral: true });
    }

    // Discord's reported contentType for zips is inconsistent, so accept by either
    // a zip mimetype or a .zip extension. The backend's multer filter still enforces
    // the real check on the multipart part we send below.
    const isZip = /\.zip$/i.test(zipAttachment.name || "") ||
        /zip/i.test(zipAttachment.contentType || "");
    if (!isZip) {
        return interaction.reply({ content: "The attached file must be a .zip archive.", ephemeral: true });
    }

    // Downloading the zip, re-uploading it, and the backend pushing every image to
    // Nextcloud easily exceeds Discord's 3s reply window, so defer up front.
    await interaction.deferReply({ ephemeral: true });

    try {
        // Pull the raw zip bytes from Discord's CDN.
        const zipResponse = await axios.get(zipAttachment.url, { responseType: "arraybuffer" });
        const zipBuffer = Buffer.from(zipResponse.data);

        // Forward as multipart/form-data under the field name multer expects ("Zipfile").
        // The Blob type must be application/zip to pass the backend's fileFilter.
        // Uses Node's global FormData/Blob (Node 18+); axios sets the boundary header.
        const form = new FormData();
        form.append(
            "Zipfile",
            new Blob([zipBuffer], { type: "application/zip" }),
            zipAttachment.name || "metadata.zip"
        );
        // Required by the backend's authWithDiscordId/checkIfAdmin middleware on /card/many.
        form.append("callerID", interaction.user.id);

        const returnData = await axios.post(`${backendUrl}/card/many`, form);

        const { count, message, cardIDs } = returnData.data || {};
        let summary = message || "Cards uploaded.";
        if (count !== undefined) summary += ` (${count} card${count === 1 ? "" : "s"})`;
        if (Array.isArray(cardIDs) && cardIDs.length) summary += `\nIDs: ${cardIDs.join(", ")}`;

        return interaction.editReply({ content: summary });
    } catch (error) {
        console.error("Error bulk uploading cards:", error);
        const details = error.response?.data?.message ? ` Details: ${error.response.data.message}` : "";
        return interaction.editReply({ content: "An error occurred while bulk uploading cards." + details });
    }
}
commandsUser.push(addManySlash);
commandMap.set(addManySlash.name, addMany);

module.exports = {
    commandsAdminCard: commandsUser,
    commandAdminCardMap: commandMap
};


