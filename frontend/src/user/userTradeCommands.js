const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');
const { AttachmentBuilder, EmbedBuilder, MediaGalleryBuilder } = require('discord.js')
const { Buffer } = require('buffer');
const fs = require('fs');

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';


const { REST, Routes, ApplicationCommandOptionType, Options, ChannelType, PermissionFlagsBits } = require('discord.js');

const commandsUser = []

const commandMap = new Map();


const makeTradeRequestReplySlash = {
    name: "make-trade-request",
    description: "Make a trade request with another user",
    options: [
        {
            name: 'user',
            description: 'The user you want to trade with',
            type: ApplicationCommandOptionType.User,
            required: true,
        }
    ],
}
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
        const userCardsResponse = await axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: userId } });
        const receiverCardsResponse = await axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: receiverId } });

        const bodyUser = userCardsResponse.data;
        const bodyReceiver = receiverCardsResponse.data;
        console.log("User cards response: ", bodyUser);
        console.log("Receiver cards response: ", bodyReceiver);

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
    
    console.log("Cards sender has: ", cardsSenderHas);
    console.log("Cards receiver has: ", cardsReceiverHas);

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

    console.log("Cards receiver has array: ", cardsReceiverHasArray);
    console.log("Cards sender has array: ", cardsSenderHasArray);
    //current page of cards for both users, bc they might have more than 25 cards

    // the cards they have in their fine collection, from db

    let currentCardPageForSenderCards = 0;

    let currentCardPageForReceiverCards = 0;

    const makeTradeWindow = (pronoun, cardsHas, cardsSelected, addCardMode, removeCardMode, currentCardPage, isSender) => {

        const currentCardsForCurrentUser = new TextDisplayBuilder().setContent(`${pronoun} currently selected cards : ` +  (cardsSelected.size > 0 ? Array.from(cardsSelected.values()).map(card => `${card.name} (Count: ${card.count})`).join(", ") : "None")).setId(isSender ? 101 : 201);

        //const currentTextForCurrentUserRow = new ActionRowBuilder().addComponents(currentCardsForCurrentUser);
        const cardHasArray = Array.from(cardsHas.values());

        const currentCardsForCurrentUserSelect = new StringSelectMenuBuilder()
            .setCustomId(isSender ? "currentCardsForCurrentUserSelect" : "otherUserCardsSelect")
            .setPlaceholder("Select a card to trade")
            .setMinValues(0)
            .setMaxValues(Math.min(cardHasArray.length - (currentCardPage * 25), 25));
        const optionArray = []


        for (let i = currentCardPage * 25; i < Math.min(cardHasArray.length, (currentCardPage + 1) * 25); i++) {
            const card = cardHasArray[i];
            optionArray.push({
                label: `Card Name: ${card.name} (Count: ${card.count})`,
                value: card.id.toString(),
            });

        }

        currentCardsForCurrentUserSelect.addOptions(optionArray);

        let currentCardsForCurrentUserSelectActionRow = new ActionRowBuilder().addComponents(currentCardsForCurrentUserSelect);

        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(isSender ? "addCardToTradeSender" : "addCardToTradeReceiver")
                .setLabel("Add Card")
                .setStyle((addCardMode) ? "Primary" : "Secondary"),
            new ButtonBuilder()
                .setCustomId(isSender ? "removeCardFromTradeSender" : "removeCardFromTradeReceiver")
                .setLabel("Remove Card")
                .setStyle((removeCardMode) ? "Danger" : "Secondary"),
        );  
        const nextPageButton = new ButtonBuilder()
            .setCustomId(isSender ? "nextPageSenderCards" : "nextPageReceiverCards")
            .setLabel("Next Page")
            .setStyle("Secondary");
            
        const previousPageButton = new ButtonBuilder()
            .setCustomId(isSender ? "previousPageSenderCards" : "previousPageReceiverCards")
            .setLabel("Previous Page")
            .setStyle("Secondary");
        const pageComponents = []
        if (currentCardPage > 0) {
            pageComponents.push(previousPageButton);
        }
        if ((currentCardPage + 1) * 25 < cardsHas.length) {
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

    const getReplyObj = () => {

        const currentUserComponents = makeTradeWindow("Your", cardsSenderHas, cardsSelectedSender, addCardModeSender, removeCardModeSender, currentCardPageForSenderCards, true);
        const otherUserComponents = makeTradeWindow("Their", cardsReceiverHas, cardsSelectedForTradeReciever, addCardModeReceiver, removeCardModeReceiver, currentCardPageForReceiverCards, false);

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
            addCardModeSender = false;

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
            await axios.post(`${backendUrl}/trade/`, {
                offeringUserDiscordID: userId,
                receivingUserDiscordID: receiverId,
                offeredCards: Array.from(cardsSelectedSender.values()).map(c => ({ card: c.id, quantity: c.count })),
                requestedCards: Array.from(cardsSelectedForTradeReciever.values()).map(c => ({ card: c.id, quantity: c.count })),
            });
            await buttonInteraction.update({ components: [new TextDisplayBuilder().setContent("Trade confirmed!")] });
            buttonCollector.stop();
            selectCollector.stop();
        }
    });

    selectCollector.on("collect", async (selectInteraction) => {
        const selectedCards = selectInteraction.values;

        if(selectInteraction.customId !== "currentCardsForCurrentUserSelect" && selectInteraction.customId !== "otherUserCardsSelect"){
            await selectInteraction.update(getReplyObj());
            return;
        }

        const forSender = selectInteraction.customId === "currentCardsForCurrentUserSelect";

        let cardsNotSelected = forSender ? cardsSenderHas : cardsReceiverHas;
        let cardsSelected = forSender ? cardsSelectedSender : cardsSelectedForTradeReciever;
        let addCardMode = forSender ? addCardModeSender : addCardModeReceiver;
        let removeCardMode = forSender ? removeCardModeSender : removeCardModeReceiver;

        if(!addCardMode && !removeCardMode){
            await selectInteraction.update(getReplyObj());
            return;
        }

        let searchSet = (addCardMode) ? cardsNotSelected : cardsSelected;
        let depositSet = (addCardMode) ? cardsSelected : cardsNotSelected;

        selectedCards.forEach(cardId => {

            let foundCard = searchSet.get(cardId);
            let foundCardInDeposit = depositSet.get(cardId);

            if (foundCard) {
                searchSet.set(cardId, {
                    id: foundCard.id,
                    name: foundCard.name,
                    count: foundCard.count -1,
                });

                if(searchSet.get(cardId).count <= 0){
                    searchSet.delete(cardId);
                }

                if(!foundCardInDeposit){
                    foundCardInDeposit = { id: foundCard.id, name: foundCard.name, count: 0 };
                }

                depositSet.set(cardId, {
                        id: foundCardInDeposit.id,
                        name: foundCardInDeposit.name,
                        count: foundCardInDeposit.count + 1,
                });
               
            }

        });

        await selectInteraction.update(getReplyObj());
    })

}
commandMap.set(makeTradeRequestReplySlash.name, makeTradeRequestReply);
commandsUser.push(makeTradeRequestReplySlash);

const viewTradeRequestsSlash = {
    name: "view-trade-requests",
    description: "View your trade requests",
    options: []
}
async function viewTradeRequests (interaction) {
    const userId = interaction.user.id;

    try {
        const response = await axios.get(`${backendUrl}/trade/getAll`, { params: { DiscordID: userId } });
        console.log("Response from backend:", response.data);

        if (!response.data || !Array.isArray(response.data)) {
            console.error("Invalid response format:", response.data);
            await interaction.reply("An error occurred while fetching trade requests. Please try again later.");
            return;
        }
        const message = response.data.map(trade => {
            return `Trade ID: ${trade._id}, From: ${trade.offeringUser}, To: ${trade.receivingUser}\nOffered Cards: ${trade.CardsOffered.map(card => card.name).join(", ")}\nRequested Cards: ${trade.CardsRequested.map(card => card.name).join(", ")}`;
        });

        const textOutput = new TextDisplayBuilder().setContent(message.join("\n\n"));
        await interaction.reply({ components: [textOutput] , flags: 1 << 15 | 64});
    } catch (error) {
        console.error("Error fetching trade requests:", error);
        await interaction.reply("An error occurred while fetching trade requests.");
    }
}
commandMap.set(viewTradeRequestsSlash.name, viewTradeRequests);
commandsUser.push(viewTradeRequestsSlash);

module.exports = {
    commandsUserTrade: commandsUser,
    commandUserTradeMap: commandMap
};
