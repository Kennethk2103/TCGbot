const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');

const dotenv = require('dotenv');

dotenv.config({ path: 'config.env' });

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';


async function makeTradeRequestReply(interaction) {
    //i do not expect this to work first try

    class Cards {
        
    }

    const components = [];

    const userId = interaction.user.id;
    const receiverId = interaction.options.getUser('user').id;

    //fetch cards from db for both users
    let cardsSenderHas = new Map();
    let cardsReceiverHas = new Map();

    try{
        const userCardsResponse = await axios.get(`${backendUrl}/user/${userId}/cards`);
        const receiverCardsResponse = await axios.get(`${backendUrl}/user/${receiverId}/cards`);

        const bodyUser = userCardsResponse.data;
        const bodyReceiver = receiverCardsResponse.data;

        if (!bodyUser.success || !bodyReceiver.success) {
            throw new Error("Failed to fetch user cards");
        }


        bodyUser.cards.forEach(card => {
            cardsSenderHas.set(card._id, { id: card._id, name: card.Name, count: card.quantity });
        });
        bodyReceiver.cards.forEach(card => {
            cardsReceiverHas.set(card._id, { id: card._id, name: card.Name, count: card.quantity });
        });
    }catch(error){
        console.error("Error fetching user cards: ", error);
        await interaction.reply("Error fetching user cards. Please try again later.");
        return;
    }
    

    // i suggest you look at steam trading rhys, this will make more sense, just understand that bc of discord handling of dropdowns
    //basically requires 


    let addCardModeSender = false;
    let addCardModeReceiver = false;

    let removeCardModeSender = false;
    let removeCardModeReceiver = false;

    let cardsSelectedSender = new Map();

    let cardsSelectedForTradeReciever = new Map();

    let cardsReceiverHasArray = Array.from(cardsReceiverHas.values());
    let cardsSenderHasArray = Array.from(cardsSenderHas.values());

    // the cards they have in their fine collection, from db

    let currentCardPageForSenderCards = 0;

    let currentCardPageForReceiverCards = 0;


    const makeTradeWindowForCurrentUser = () => {

        const currentCardsForCurrentUser = new TextDisplayBuilder().setContent("Your currently selected cards : " +  (cardsSelectedSender.size > 0 ? Array.from(cardsSelectedSender.values()).map(card => `${card.name} (Count: ${card.count})`).join(", ") : "None")).setId(101);

        //const currentTextForCurrentUserRow = new ActionRowBuilder().addComponents(currentCardsForCurrentUser);

        const currentCardsForCurrentUserSelect = new StringSelectMenuBuilder()
            .setCustomId("currentCardsForCurrentUserSelect")
            .setPlaceholder("Select a card to trade")
            .setMinValues(0)
            .setMaxValues(Math.min(cardsSenderHas.size - (currentCardPageForSenderCards * 25), 25));


        const optionArray = []
        for (let i = currentCardPageForSenderCards * 25; i < Math.min(cardsSenderHasArray.length, (currentCardPageForSenderCards + 1) * 25); i++) {
            const card = cardsSenderHasArray[i];
            optionArray.push({
                label: `Card Name: ${card.name} (Count: ${card.count})`,
                value: card.id.toString(),
            });

        }

        currentCardsForCurrentUserSelect.addOptions(optionArray);

        let currentCardsForCurrentUserSelectActionRow = new ActionRowBuilder().addComponents(currentCardsForCurrentUserSelect);

        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("addCardToTradeSender")
                .setLabel("Add Card")
                .setStyle((addCardModeSender) ? "Primary" : "Secondary"),
            new ButtonBuilder()
                .setCustomId("removeCardFromTradeSender")
                .setLabel("Remove Card")
                .setStyle((removeCardModeSender) ? "Danger" : "Secondary"),
        );

        const nextPageButton = new ButtonBuilder()
            .setCustomId("nextPageSenderCards")
            .setLabel("Next Page")
            .setStyle("Secondary");

        const previousPageButton = new ButtonBuilder()
            .setCustomId("previousPageSenderCards")
            .setLabel("Previous Page")
            .setStyle("Secondary");

        const pageComponents = []
        if (currentCardPageForSenderCards > 0) {
            pageComponents.push(previousPageButton);
        }
        if ((currentCardPageForSenderCards + 1) * 25 < cardsSenderHas.size) {
            pageComponents.push(nextPageButton);
        }

       let returnComponents = [];
        if (pageComponents.length > 0) {
            returnComponents = [
                currentCardsForCurrentUser,
                currentCardsForCurrentUserSelectActionRow,
                addRemoveContainer,
                new ActionRowBuilder().addComponents(pageComponents)
            ];
        } else {
            returnComponents = [
                currentCardsForCurrentUser,
                currentCardsForCurrentUserSelectActionRow,
                addRemoveContainer
            ];
        }
        

        return returnComponents;
    }

    const makeTradeWindowForOtherUser = () => {

        const otherUserCardsText = new TextDisplayBuilder().setContent("Their currently selected cards : " +  (cardsSelectedForTradeReciever.size > 0 ? Array.from(cardsSelectedForTradeReciever.values()).map(card => `${card.name} (Count: ${card.count})`).join(", ") : "None")).setId(201);

        //const otherUserCardsTextRow = new ActionRowBuilder().addComponents(otherUserCardsText);

        const otherUserCardsSelect = new StringSelectMenuBuilder()
            .setCustomId("otherUserCardsSelect")
            .setPlaceholder("Select a card to trade")
            .setMinValues(0)
            .setMaxValues(Math.min(cardsReceiverHasArray.length - (currentCardPageForReceiverCards * 25), 25));

        const optionArray = []
        for (let i = currentCardPageForReceiverCards * 25; i < Math.min(cardsReceiverHasArray.length, (currentCardPageForReceiverCards + 1) * 25); i++) {
            const card = cardsReceiverHasArray[i];
            optionArray.push({
                label: `Card Name: ${card.name} (Count: ${card.count})`,
                value: card.id.toString(),
            });

        }

        otherUserCardsSelect.addOptions(optionArray);

        let otherUserCardsSelectActionRow = new ActionRowBuilder().addComponents(otherUserCardsSelect);


        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("addCardToTradeReceiver")
                .setLabel("Add Card")
                .setStyle((addCardModeReceiver) ? "Primary" : "Secondary"),
            new ButtonBuilder()
                .setCustomId("removeCardFromTradeReceiver")
                .setLabel("Remove Card")
                .setStyle((removeCardModeReceiver) ? "Danger" : "Secondary"),
        );

        const nextPageButton = new ButtonBuilder()
            .setCustomId("nextPageReceiverCards")
            .setLabel("Next Page")
            .setStyle("Secondary");

        const previousPageButton = new ButtonBuilder()
            .setCustomId("previousPageReceiverCards")
            .setLabel("Previous Page")
            .setStyle("Secondary");

        const pageComponents = []
        if (currentCardPageForReceiverCards > 0) {
            pageComponents.push(previousPageButton);
        }
        if ((currentCardPageForReceiverCards + 1) * 25 < cardsReceiverHas.size) {
            pageComponents.push(nextPageButton);
        }

        let components = [];
        if (pageComponents.length > 0) {
            components = [
                otherUserCardsText,
                otherUserCardsSelectActionRow,
                addRemoveContainer,
                new ActionRowBuilder().addComponents(pageComponents)
            ];
        } else {
            components = [
                otherUserCardsText,
                otherUserCardsSelectActionRow,
                addRemoveContainer
            ];
        }
        return components;
    }

    const getReplyObj = () => {

        const currentUserComponents = makeTradeWindowForCurrentUser();
        const otherUserComponents = makeTradeWindowForOtherUser();

        const cancelButton = new ButtonBuilder()
            .setCustomId("cancelTrade")
            .setLabel("Cancel Trade")
            .setStyle("Danger");

        const confirmButton = new ButtonBuilder()
            .setCustomId("confirmTrade")
            .setLabel("Confirm Trade")
            .setStyle("Success");

        const actionRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);

        return  {
            components: currentUserComponents.concat(otherUserComponents).concat([actionRow]),
            flags: 1 << 15 | 64,
        };
    }


    const reply = await interaction.reply(getReplyObj());


    const buttonCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
    })
    const selectCollector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
    });



    buttonCollector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === "addCardToTradeSender") {
            addCardModeSender = !addCardModeSender;
            removeCardModeSender = false;
            addCardModeReceiver = false;
            removeCardModeReceiver = false;
            
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "removeCardFromTradeSender") {
            removeCardModeSender = !removeCardModeSender;
            removeCardModeReceiver = false
            addCardModeReceiver = false;
            addCardModeReceiver = false;

            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "nextPageSenderCards") {
            currentCardPageForSenderCards++;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "previousPageSenderCards") {
            currentCardPageForSenderCards--;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "addCardToTradeReceiver") {
            addCardModeReceiver = !addCardModeReceiver;
            removeCardModeReceiver = false;
            addCardModeSender = false;
            removeCardModeSender = false;
        
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "removeCardFromTradeReceiver") {
            removeCardModeReceiver = !removeCardModeReceiver;
            removeCardModeSender = false;   
            addCardModeSender = false;
            addCardModeReceiver = false;
            //cardsSelectedForTradeReciever = cardsSelectedForTradeReciever.filter(c => !selectedCards.includes(c.id.toString()));
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "nextPageReceiverCards") {
            currentCardPageForReceiverCards++;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "previousPageReceiverCards") {
            currentCardPageForReceiverCards--;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "cancelTrade") {
            await buttonInteraction.update({components: [new TextDisplayBuilder().setContent("Trade cancelled.")] });
            buttonCollector.stop();
            selectCollector.stop();
        } else if (buttonInteraction.customId === "confirmTrade") {
            // Handle trade confirmation logic here
            await buttonInteraction.update({ components: [new TextDisplayBuilder().setContent("Trade confirmed!")] });
            buttonCollector.stop();
            selectCollector.stop();
        }
    });

    selectCollector.on('collect', async (selectInteraction) => {
        if (selectInteraction.customId === "currentCardsForCurrentUserSelect") {
            const selectedCards = selectInteraction.values;
            if (addCardModeSender) {
                selectedCards.forEach(cardId => {
                    cardId = parseInt(cardId);
                    let foundCard = cardsSenderHas.get(cardId);
                    if (foundCard.count>0 && (cardsSenderHas.get(cardId).count > cardsSelectedSender.get(cardId)?.count || !cardsSelectedSender.has(cardId))) {}
                        cardsSelectedSender.set(cardId, {
                            id: foundCard.id,
                            name: foundCard.name,
                            count: (cardsSelectedSender.get(cardId)?.count || 0) + 1
                        });
                       
                    }
                );
            }
            else if (removeCardModeSender) {
                selectedCards.forEach(cardId => 
                    {
                    cardId = parseInt(cardId);
                    if (cardsSelectedSender.has(cardId)) {
                        let currentCount = cardsSelectedSender.get(cardId).count;
                        if (currentCount > 1) {
                            cardsSelectedSender.set(cardId, {
                                id: cardsSelectedSender.get(cardId).id,
                                name: cardsSelectedSender.get(cardId).name,
                                count: currentCount - 1
                            });
                        }
                        else {
                            cardsSelectedSender.delete(cardId);
                        }
                    }
                });
            }
        
            await selectInteraction.update(getReplyObj());
        } else if (selectInteraction.customId === "otherUserCardsSelect") {
            const selectedCards = selectInteraction.values;
            console.log("Selected cards for receiver: ", selectedCards);
            if (addCardModeReceiver) {
                selectedCards.forEach(cardId => {
                    cardId = parseInt(cardId);
                    let foundCard = cardsReceiverHas.get(cardId);
                    console.log("Found card: ", foundCard);
                    if (foundCard.count>0 && (cardsReceiverHas.get(cardId).count > cardsSelectedForTradeReciever.get(cardId)?.count || !cardsSelectedForTradeReciever.has(cardId))) {
                        cardsSelectedForTradeReciever.set(cardId, {
                            id: foundCard.id,
                            name: foundCard.name,
                            count: (cardsSelectedForTradeReciever.get(cardId)?.count || 0) + 1
                        });
                    }
                });
            } else if (removeCardModeReceiver) {
                selectedCards.forEach(cardId => {
                    cardId = parseInt(cardId);
                    if (cardsSelectedForTradeReciever.has(cardId)) {
                        let currentCount = cardsSelectedForTradeReciever.get(cardId).count;
                        if (currentCount > 1) {
                            cardsSelectedForTradeReciever.set(cardId, {
                                id: cardsSelectedForTradeReciever.get(cardId).id,
                                name: cardsSelectedForTradeReciever.get(cardId).name,
                                count: currentCount - 1
                            });
                        } else {
                            cardsSelectedForTradeReciever.delete(cardId);
                        }
                    }
                });
            }
           
            await selectInteraction.update(getReplyObj());
        }
    });

}

async function listCards (interaction) {

    const userId = interaction.user.id;
    try{
        const userResponse = await axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: userId } });
        let userCards = userResponse.data.cards;
        let outputList = "";

        new Array(userCards).forEach(card => {
            outputList += `Card Name: ${card.Name}, Quantity: ${card.quantity}\n`;
        });

         const textoutput = new TextDisplayBuilder().setContent(outputList || "No cards found.").setId("cardListOutput");

        return await interaction.reply([textoutput]);


    }catch(error){
        console.error("Error fetching user cards: ", error);
        await interaction.reply("Error fetching user cards. Please try again later.");
        return;
    }




    
}

async function openPack (interaction) {
    try{
        const userId = interaction.user.id;
        const set = interaction.options.getNumber('set');

        const response = await axios.post(`${backendUrl}/user/openpack`, { DiscordID: userId, SetNo: set });

        if (response.data.success) {
            const openedCardsIDArray = response.data.cards;

            const openCardArray = []
            for (const cardId of openedCardsIDArray) {
                const cardResponse = await axios.get(`${backendUrl}/card/`, { params: { ID: cardId } });
                if(cardResponse.data.count < 1){
                    console.warn(`Card with ID ${cardId} not found or has no cards.`);
                    continue; // Skip if no cards found
                }
                const cardData = cardResponse.data.cards[0];
                openCardArray.push(`Card Name: ${cardData.Name}, Rarity: ${cardData.Rarity}, Set: ${cardData.Set}`);
            }
            
        } else {
            await interaction.reply(`Failed to open pack: ${response.data.message}`);
        }

    }
    catch (error) {
        console.error("Error opening pack:", error);
        await interaction.reply("An error occurred while opening the pack. Please try again later.");
    }
    
}

async function viewCard (interaction) {
    const cardId = interaction.options.getString('cardid');

    try {
        const response = await axios.get(`${backendUrl}/card/`, { params: { ID: cardId } });
        if (response.data.success) {
            const cardData = response.data.cards[0];
            const cardDetails = `Card Name: ${cardData.Name}\nDescription: ${cardData.Subtitle}\nRarity: ${cardData.Rarity}\nSet: ${cardData.Set}\nNum: ${cardData.Num}`;
            await interaction.reply(cardDetails);
        } else {
            await interaction.reply(`Card not found with ID: ${cardId}`);
        }
    } catch (error) {
        console.error("Error fetching card details:", error);
        await interaction.reply("An error occurred while fetching the card details. Please try again later.");
    }

}

async function viewTradeRequests (interaction) {
    await interaction.reply("Viewing trade requests is not implemented yet.");
}


exports.makeTradeRequestReply = makeTradeRequestReply;
exports.listCards = listCards;