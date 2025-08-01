const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ButtonBuilder } = require('discord.js');




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

    let cardsSelectedSender = []//what you are actively clicking with your funny little cursor : ), basically before you select to

    let cardsSelectedForTradeReciever = []//for the trade in general

    let cardsActivelySelectedSender = []//what you are actively clicking with your funny little cursor : ), basically before you select to

    let cardsActivelySelectedReceiver = []

    let cardsSenderHas = []// the cards you have in your fine collection, from db

    let cardsReceiverHas = [];// the cards they have in their fine collection, from db

    let currentCardPageForSenderCards = 0;

    let currentCardPageForReceiverCards = 0;


    const makeTradeWindowForCurrentUser = () => {
        const currentUserContainer = new ContainerBuilder().setId("currentUserContainer")

        const currentCardsForCurrentUser = new TextDisplayBuilder().setContent("Your Cards").setId("currentCardsForCurrentUser");

        const currentCardsForCurrentUserSelect = new StringSelectMenuBuilder()
            .setCustomId("currentCardsForCurrentUserSelect")
            .setPlaceholder("Select a card to trade")
            .setMinValues(0)
            .setMaxValues(Math.min(cardsSenderHas.length, 25));


        const optionArray = []
        for (let i = currentCardPageForSenderCards * 25; i < Math.min(cardsSenderHas.length, (currentCardPageForSenderCards + 1) * 25); i++) {
            const card = cardsSenderHas[i];
            optionArray.push({
                label: `Card Name: ${card.name} (Count: ${card.count})`,
                value: card.id.toString(),
            });

        }

        currentCardsForCurrentUserSelect.addOptions(optionArray);

        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("addCardToTradeSender")
                .setLabel("Add Card")
                .setStyle("Primary"),
            new ButtonBuilder()
                .setCustomId("removeCardFromTradeSender")
                .setLabel("Remove Card")
                .setStyle("Secondary"),
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
        if ((currentCardPageForSenderCards + 1) * 25 < cardsSenderHas.length) {
            pageComponents.push(nextPageButton);
        }

        if (pageComponents.length > 0) {
            currentUserContainer.addComponents(
                currentCardsForCurrentUser,
                currentCardsForCurrentUserSelect,
                addRemoveContainer,
                new ActionRowBuilder().addComponents(pageComponents)
            );
        }

        else {
            currentUserContainer.addComponents(
                currentCardsForCurrentUser,
                currentCardsForCurrentUserSelect,
                addRemoveContainer
            );
        }

        return currentUserContainer;
    }

    const makeTradeWindowForOtherUser = () => {
        const otherUserContainer = new ContainerBuilder().setId("otherUserContainer");

        const otherUserCardsText = new TextDisplayBuilder().setContent("Their Cards").setId("otherUserCardsText");

        const otherUserCardsSelect = new StringSelectMenuBuilder()
            .setCustomId("otherUserCardsSelect")
            .setPlaceholder("Select a card to trade")
            .setMinValues(0)
            .setMaxValues(Math.min(cardsReceiverHas.length, 25));

        const optionArray = []
        for (let i = currentCardPageForReceiverCards * 25; i < Math.min(cardsReceiverHas.length, (currentCardPageForReceiverCards + 1) * 25); i++) {
            const card = cardsReceiverHas[i];
            optionArray.push({
                label: `Card Name: ${card.name} (Count: ${card.count})`,
                value: card.id.toString(),
            });

        }

        otherUserCardsSelect.addOptions(optionArray);

        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("addCardToTradeReceiver")
                .setLabel("Add Card")
                .setStyle("Primary"),
            new ButtonBuilder()
                .setCustomId("removeCardFromTradeReceiver")
                .setLabel("Remove Card")
                .setStyle("Secondary"),
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
        if ((currentCardPageForReceiverCards + 1) * 25 < cardsReceiverHas.length) {
            pageComponents.push(nextPageButton);
        }

        if (pageComponents.length > 0) {
            otherUserContainer.addComponents(
                otherUserCardsText,
                otherUserCardsSelect,
                addRemoveContainer,
                new ActionRowBuilder().addComponents(pageComponents)
            );
        }

        else {
            otherUserContainer.addComponents(
                otherUserCardsText,
                otherUserCardsSelect,
                addRemoveContainer
            );
        }
        return otherUserContainer;
    }

    const getReplyObj = () => {



        const currentUserContainer = makeTradeWindowForCurrentUser();
        const otherUserContainer = makeTradeWindowForOtherUser();

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
            content: "Trade Request",
            components: [currentUserContainer, otherUserContainer, actionRow],
            ephemeral: true,
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
            const selectedCards = buttonInteraction.values;
            for (const cardId of selectedCards) {
                const card = cardsSenderHas.find(c => c.id.toString() === cardId);
                if (card && !cardsSelectedSender.some(c => c.id === card.id)) {
                    cardsSelectedSender.push(card);
                }
            }
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "removeCardFromTradeSender") {
            const selectedCards = buttonInteraction.values;
            //cardsSelectedSender = cardsSelectedSender.filter(c => !selectedCards.includes(c.id.toString()));
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "nextPageSenderCards") {
            currentCardPageForSenderCards++;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "previousPageSenderCards") {
            currentCardPageForSenderCards--;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "addCardToTradeReceiver") {
            const selectedCards = buttonInteraction.values;
            for (const cardId of selectedCards) {
                const card = cardsReceiverHas.find(c => c.id.toString() === cardId);
                if (card && !cardsSelectedForTradeReciever.some(c => c.id === card.id)) {
                    cardsSelectedForTradeReciever.push(card);
                }
            }
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "removeCardFromTradeReceiver") {
            const selectedCards = buttonInteraction.values;
            //cardsSelectedForTradeReciever = cardsSelectedForTradeReciever.filter(c => !selectedCards.includes(c.id.toString()));
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "nextPageReceiverCards") {
            currentCardPageForReceiverCards++;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "previousPageReceiverCards") {
            currentCardPageForReceiverCards--;
            await buttonInteraction.update(getReplyObj());
        } else if (buttonInteraction.customId === "cancelTrade") {
            await buttonInteraction.update({ content: "Trade cancelled.", components: [] });
            buttonCollector.stop();
            selectCollector.stop();
        } else if (buttonInteraction.customId === "confirmTrade") {
            // Handle trade confirmation logic here
            await buttonInteraction.update({ content: "Trade confirmed!", components: [] });
            buttonCollector.stop();
            selectCollector.stop();
        }
    });

}


