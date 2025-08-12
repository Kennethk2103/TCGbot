const axios = require('axios');

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
            Set: set,
            Num: numInSet,
            Artwork: {
                data: imageBuffer,
                contentType: image.contentType
            },
            Artist: artist
        }, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
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

async function addset(interaction) {


    const name = interaction.options.getString("name");


    if (!name) {
        return interaction.reply({ content: "Please provide the name of the set.", ephemeral: true });
    }

    //send it to the backend to add the set
    try {
        const returnData = await axios.post(`${process.env.backendURL}/api/set/add`, { Name: name });

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

async function removeSet(interaction) {
    const id = interaction.options.getString("id");

    if (!id) {
        return interaction.reply({ content: "Please provide the ID of the set to remove.", ephemeral: true });
    }

    //send it to the backend to remove the set
    try {
        const returnData = await axios.delete(`${process.env.backendURL}/api/set/remove`, {
            data: { ID: id }
        });

        if (returnData.status === 200) {
            return interaction.reply({ content: "Set removed successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Failed to remove set.", ephemeral: true });
        }
    } catch (error) {
        console.error("Error removing set:", error);
        return interaction.reply({ content: "An error occurred while removing the set.", ephemeral: true });
    }

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

module.exports = {
    addCard,
    removeCard,
    viewUserInventory,
    addset, 
    removeSet,
    editCard,
    giveCard
};