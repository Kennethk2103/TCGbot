const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ComponentsV2Assertions, CompressionMethod } = require('discord.js');

import dotenv from 'dotenv';

dotenv.config({ path: 'config.env' });

const axios = require('axios');

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5050/api';


async function makeTradeRequestReply(interaction) {
    //i do not expect this to work first try

    class card {
        constructor(id, count, name) {
            this.id = id;
            this.name = name
            this.count = count;
        }

    }

    const components = [];

    // i suggest you look at steam trading rhys, this will make more sense, just understand that bc of discord handling of dropdowns
    //basically requires 


    let addCardModeSender = false;
    let addCardModeReceiver = false;

    let removeCardModeSender = false;
    let removeCardModeReceiver = false;

    let cardsSelectedSender = new Map();

    let cardsSelectedForTradeReciever = new Map();

    let cardsSenderHas = new Map([
        [1, { id: 1, count: 5, name: "Card A" }],
        [2, { id: 2, count: 3, name: "Card B" }],
        [3, { id: 3, count: 10, name: "Card C" }]
    ]);

    let cardsReceiverHas = new Map([
        [4, { id: 4, count: 2, name: "Card D" }],
        [5, { id: 5, count: 1, name: "Card E" }],
        [6, { id: 6, count: 4, name: "Card F" }],
        [7, { id: 7, count: 3, name: "Card G" }],
        [8, { id: 8, count: 2, name: "Card H" }],
        [9, { id: 9, count: 5, name: "Card I" }],
        [10, { id: 10, count: 1, name: "Card J" }],
        [11, { id: 11, count: 2, name: "Card K" }],
        [12, { id: 12, count: 4, name: "Card L" }],
        [13, { id: 13, count: 3, name: "Card M" }],
        [14, { id: 14, count: 2, name: "Card N" }],
        [15, { id: 15, count: 5, name: "Card O" }],
        [16, { id: 16, count: 1, name: "Card P" }],
        [17, { id: 17, count: 2, name: "Card Q" }],
        [18, { id: 18, count: 4, name: "Card R" }],
        [19, { id: 19, count: 3, name: "Card S" }],
        [20, { id: 20, count: 2, name: "Card T" }],
        [21, { id: 21, count: 5, name: "Card U" }],
        [22, { id: 22, count: 1, name: "Card V" }],
        [23, { id: 23, count: 2, name: "Card W" }],
        [24, { id: 24, count: 4, name: "Card X" }],
        [25, { id: 25, count: 3, name: "Card Y" }],
        [26, { id: 26, count: 2, name: "Card Z" }],
        [27, { id: 27, count: 5, name: "Card AA" }],
        [28, { id: 28, count: 1, name: "Card AB" }],
        [29, { id: 29, count: 2, name: "Card AC" }],
        [30, { id: 30, count: 4, name: "Card AD" }],
        [31, { id: 31, count: 3, name: "Card AE" }],
        [32, { id: 32, count: 2, name: "Card AF" }],
        [33, { id: 33, count: 5, name: "Card AG" }],
        [34, { id: 34, count: 1, name: "Card AH" }],
        [35, { id: 35, count: 2, name: "Card AI" }],
        [36, { id: 36, count: 4, name: "Card AJ" }],
        [37, { id: 37, count: 3, name: "Card AK" }],
        [38, { id: 38, count: 2, name: "Card AL" }],
        [39, { id: 39, count: 5, name: "Card AM" }],
        [40, { id: 40, count: 1, name: "Card AN" }],
        [41, { id: 41, count: 2, name: "Card AO" }],
        [42, { id: 42, count: 4, name: "Card AP" }],
        [43, { id: 43, count: 3, name: "Card AQ" }],
        [44, { id: 44, count: 2, name: "Card AR" }],
        [45, { id: 45, count: 5, name: "Card AS" }],
        [46, { id: 46, count: 1, name: "Card AT" }],
        [47, { id: 47, count: 2, name: "Card AU" }],
        [48, { id: 48, count: 4, name: "Card AV" }],
        [49, { id: 49, count: 3, name: "Card AW" }],
        [50, { id: 50, count: 2, name: "Card AX" }],
        [51, { id: 51, count: 5, name: "Card AY" }],
        [52, { id: 52, count: 1, name: "Card AZ" }],
        [53, { id: 53, count: 2, name: "Card BA" }],
        [54, { id: 54, count: 4, name: "Card BB" }]
    ]);

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
    const userCards = await axios.get(`${backendUrl}/user/${userId}/cards`);


    let outputList = ""

    
    

    const textoutput = new TextDisplayBuilder().setContent(outputList || "No cards found.").setId("cardListOutput");

    await interaction.reply([textoutput]);
}

async function openPack (interaction) {
    
    try{

    }
}

async function viewCard (interaction) {

    let selectedCard = {
        id: interaction.options.getString("card"),
        name: "Example Card",
        description: "This is an example card description.",
        rarity: "Rare",
        set: "Example Set",
        image:[]
    }

}

async function viewTradeRequests (interaction) {
    await interaction.reply("Viewing trade requests is not implemented yet.");
}


exports.makeTradeRequestReply = makeTradeRequestReply;
exports.listCards = listCards;