const axios = require('axios');

const backendURL = process.env.backendURL || 'http://localhost:5050';

async function addCard(interaction) {

    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const rarity = interaction.options.getString("rarity");
    const set = interaction.options.getString("set");
    const image = interaction.options.getAttachment("image");
    const artist = interaction.options.getString("artist");
    const numInSet = interaction.options.getInteger("num_in_set");

    console.log("Adding card with details:", {
        name,
        description,
        rarity,
        set,
        image,
    });




    if (!name || !description || !rarity || !set || !image || !numInSet || !artist) {
        return interaction.reply({ content: "Please provide all required fields.", ephemeral: true });
    }


    //download the image
    const imageUrl = image.url;
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');

    //send it to the backend to add the card
    try {
        

        const returnData = await axios.post(`${process.env.backendURL}/api/card/`,{
            Name: name,
            Subtitle: description,
            Rarity: rarity,
            SetRef: set,
            Num: numInSet,
            Artwork: {
                data: imageBuffer,
                contentType: image.contentType
            },
            Artist: artist,
            callerID: interaction.user.id
        });

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

async function removeCard(interaction) {
    const name = interaction.options.getString("name");

    if (!name) {
        return interaction.reply({ content: "Please provide the name of the card to remove.", ephemeral: true });
    }

    //send it to the backend to remove the card
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/card/remove`, {
            data: { Name: name }
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card removed successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to remove card.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error removing card:", error);
        return interaction.reply({ content: "An error occurred while removing the card.", ephemeral: true });
    }

}

async function viewUserInventory(interaction) {

}

async function editCard(interaction) {
    const cardId = interaction.options.getString("cardid");
    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");
    const rarity = interaction.options.getString("rarity");
    const set = interaction.options.getString("set");
    const image = interaction.options.getAttachment("image");
    const num = interaction.options.getInteger("num");

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
            Set: set,
            Artwork: {
                data: image.buffer,
                contentType: image.mimetype
            },
            Num: num
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

async function giveCard(interaction) {

}

async function deleteCard(interaction) {
    const cardId = interaction.options.getString("cardid");

    if (!cardId) {
        return interaction.reply({ content: "Please provide the card ID.", ephemeral: true });
    }

    //send it to the backend to delete the card
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/card/delete`, {
            data: { ID: cardId }
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

async function deleteSet(interaction) {
    const setId = interaction.options.getString("setid");

    if (!setId) {
        return interaction.reply({ content: "Please provide the set ID.", ephemeral: true });
    }

    //send it to the backend to delete the set
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/set/delete`, {
            data: { ID: setId }
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Set deleted successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to delete set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error deleting set:", error);
        return interaction.reply({ content: "An error occurred while deleting the set.", ephemeral: true });
    }

}

async function addSet(interaction) {
    const name = interaction.options.getString("name");
    const setNo = interaction.options.getInteger("setno");
    const DiscordID = interaction.user.id;

    if (!name || !setNo) {
        return interaction.reply({ content: "Please provide both the name and set number.", ephemeral: true });
    }

    //send it to the backend to add the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/`, { Name: name, SetNo: setNo, callerID : DiscordID });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Set added successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to add set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error adding set:", error);
        return interaction.reply({ content: "An error occurred while adding the set.", ephemeral: true });
    }
}

async function removeCardFromSet(interaction) {
    const setId = interaction.options.getString("setid");
    const cardId = interaction.options.getString("cardid");

    if (!setId || !cardId) {
        return interaction.reply({ content: "Please provide both the set ID and card ID.", ephemeral: true });
    }

    //send it to the backend to remove the card from the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/removeCard`, { SetID: setId, CardID: cardId });

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

async function addOrMoveCardToSet(interaction) {
    const setId = interaction.options.getString("setid");
    const cardId = interaction.options.getString("cardid");

    if (!setId || !cardId) {
        return interaction.reply({ content: "Please provide both the set ID and card ID.", ephemeral: true });
    }

    //send it to the backend to add or move the card to the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/addOrMoveCard`, { SetID: setId, CardID: cardId });

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

async function giveUserCard(interaction) {
    const userId = interaction.options.getUser("user").id;
    const cardId = interaction.options.getString("cardid");
    const amount = interaction.options.getInteger("amount");

    if (!userId || !cardId || !amount) {
        return interaction.reply({ content: "Please provide the user ID, card ID, and amount.", ephemeral: true });
    }

    //send it to the backend to give the card to the user
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/user/giveCard`, { DiscordID: userId, CardID: cardId, Amount: amount });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Card given to user successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to give card to user.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error giving card to user:", error);
        return interaction.reply({ content: "An error occurred while giving the card to the user.", ephemeral: true });
    }
}

async function setAdmin(interaction) {
    const userId = interaction.options.getUser("user").id;
    const isAdmin = interaction.options.getBoolean("isadmin");

    console.log("Setting admin status for user:", {
        userId,
        isAdmin
    });

    if (!userId || isAdmin === undefined) {
        return interaction.reply({ content: "Please provide the user ID and admin status.", ephemeral: true });
    }

    //send it to the backend to set the user as admin
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/user/admin`, { DiscordID: userId, TorF: (isAdmin) ? "true" : "false" });

        if (returnData.status === 200) {
            return interaction.reply({ content: `User ${isAdmin ? 'set as' : 'removed from'} admin successfully!`, ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to set admin status.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error setting admin status:", error);
        return interaction.reply({ content: "An error occurred while setting the admin status.", ephemeral: true });
    }
}


module.exports = {
    addCard,
    removeCard,
    deleteCard,
    addOrMoveCardToSet,
    removeCardFromSet,
    addSet,
    deleteSet,
    viewUserInventory,
    editCard,
    giveCard,
    setAdmin
};