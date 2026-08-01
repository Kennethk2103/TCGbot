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

    try {
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
    } catch (error) {
        console.error("Error fetching user cards: ", error);
        await interaction.reply("Error fetching user cards. Please try again later.");
        return;
    }

    console.log("Cards sender has: ", cardsSenderHas);
    console.log("Cards receiver has: ", cardsReceiverHas);

    // i suggest you look at steam trading rhys, this will make more sense, just understand that bc of discord handling of dropdowns
    //basically requires 


    let addCardModeSender = true;
    let addCardModeReceiver = true;

    let removeCardModeSender = false;
    let removeCardModeReceiver = false;

    let cardsSelectedSender = new Map();
    let cardsSelectedForTradeReciever = new Map();

    let pendingCardSender = null;
    let pendingCardReceiver = null;

    let cardsReceiverHasArray = Array.from(cardsReceiverHas.values());
    let cardsSenderHasArray = Array.from(cardsSenderHas.values());

    console.log("Cards receiver has array: ", cardsReceiverHasArray);
    console.log("Cards sender has array: ", cardsSenderHasArray);
    //current page of cards for both users, bc they might have more than 25 cards

    // the cards they have in their fine collection, from db

    let currentCardPageForSenderCards = 0;

    let currentCardPageForReceiverCards = 0;

    const makeTradeWindow = (pronoun, cardsHas, cardsSelected, addCardMode, removeCardMode, currentCardPage, isSender, pendingCard) => {

        const header = new TextDisplayBuilder()
            .setContent(isSender ? "## Your Offer" : "## You're Requesting")
            .setId(isSender ? 100 : 200);

        const currentCardsForCurrentUser = new TextDisplayBuilder()
            .setContent((isSender ? "Offering: " : "Requesting: ") + (cardsSelected.size > 0 ? Array.from(cardsSelected.values()).map(card => `${card.name} (x${card.count})`).join(", ") : "None"))
            .setId(isSender ? 101 : 201);

        const displayPool = removeCardMode ? cardsSelected : cardsHas;
        const cardHasArray = Array.from(displayPool.values());

        let selectorRow;
        if (pendingCard) {
            const maxQty = Math.min(pendingCard.count, 25);
            const quantitySelect = new StringSelectMenuBuilder()
                .setCustomId(isSender ? "quantitySelectorSender" : "quantitySelectorReceiver")
                .setPlaceholder(`How many ${pendingCard.name}? (${isSender ? "you have" : "they have"} ${pendingCard.count})`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(Array.from({ length: maxQty }, (_, i) => ({
                    label: `${i + 1}`,
                    value: `${i + 1}`,
                })));
            selectorRow = new ActionRowBuilder().addComponents(quantitySelect);
        } else {
            const totalPages = Math.ceil(displayPool.size / 25) || 1;
            const hasPrev = currentCardPage > 0;
            const hasNext = (currentCardPage + 1) * 25 < displayPool.size;

            // Reserve slots for nav options so cards never push past 25 total options
            const navSlots = (hasPrev ? 1 : 0) + (hasNext ? 1 : 0);
            const cardSlots = 25 - navSlots;
            const pageSlice = cardHasArray.slice(currentCardPage * 25, currentCardPage * 25 + cardSlots);

            const action = removeCardMode ? "Remove" : "Add";
            const options = pageSlice.map(card => ({
                label: `${card.name} (x${card.count})`,
                value: card.id.toString(),
            }));

            if (hasPrev) options.push({ label: `◀  Page ${currentCardPage} of ${totalPages}`, value: '__prev_page__' });
            if (hasNext) options.push({ label: `Page ${currentCardPage + 2} of ${totalPages}  ▶`, value: '__next_page__' });

            const cardSelect = new StringSelectMenuBuilder()
                .setCustomId(isSender ? "currentCardsForCurrentUserSelect" : "otherUserCardsSelect")
                .setPlaceholder(`${action} a card — page ${currentCardPage + 1} of ${totalPages}`)
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(options);
            selectorRow = new ActionRowBuilder().addComponents(cardSelect);
        }

        const addRemoveContainer = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(isSender ? "addCardToTradeSender" : "addCardToTradeReceiver")
                .setLabel("Add Card")
                .setStyle(addCardMode ? "Primary" : "Secondary"),
            new ButtonBuilder()
                .setCustomId(isSender ? "removeCardFromTradeSender" : "removeCardFromTradeReceiver")
                .setLabel("Remove Card")
                .setStyle(removeCardMode ? "Danger" : "Secondary"),
        );

        const returnComponents = [header, currentCardsForCurrentUser, selectorRow, addRemoveContainer];

        return returnComponents;
    }

    const getReplyObj = () => {

        const currentUserComponents = makeTradeWindow("Your", cardsSenderHas, cardsSelectedSender, addCardModeSender, removeCardModeSender, currentCardPageForSenderCards, true, pendingCardSender);
        const otherUserComponents = makeTradeWindow("Their", cardsReceiverHas, cardsSelectedForTradeReciever, addCardModeReceiver, removeCardModeReceiver, currentCardPageForReceiverCards, false, pendingCardReceiver);

        const cancelButton = new ButtonBuilder()
            .setCustomId("cancelTrade")
            .setLabel("Cancel Trade")
            .setStyle("Danger");

        const confirmButton = new ButtonBuilder()
            .setCustomId("confirmTrade")
            .setLabel("Confirm Trade")
            .setStyle("Success");

        const actionRow = new ActionRowBuilder().addComponents(cancelButton, confirmButton);

        return {
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
        } else if (buttonInteraction.customId === "cancelTrade") {
            await buttonInteraction.update({ components: [new TextDisplayBuilder().setContent("Trade cancelled.")] });
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

    const applyQuantity = (cardId, quantity, sourceMap, destMap) => {
        const card = sourceMap.get(cardId);
        if (!card) return;

        const newSourceCount = card.count - quantity;
        if (newSourceCount <= 0) {
            sourceMap.delete(cardId);
        } else {
            sourceMap.set(cardId, { ...card, count: newSourceCount });
        }

        const existing = destMap.get(cardId);
        destMap.set(cardId, {
            id: card.id,
            name: card.name,
            count: (existing ? existing.count : 0) + quantity,
        });
    };

    selectCollector.on("collect", async (selectInteraction) => {
        const { customId, values } = selectInteraction;

        // Quantity confirmed for sender
        if (customId === "quantitySelectorSender") {
            const quantity = parseInt(values[0]);
            const card = pendingCardSender;
            pendingCardSender = null;
            if (card) {
                const sourceMap = removeCardModeSender ? cardsSelectedSender : cardsSenderHas;
                const destMap = removeCardModeSender ? cardsSenderHas : cardsSelectedSender;
                applyQuantity(card.id.toString(), quantity, sourceMap, destMap);
            }
            await selectInteraction.update(getReplyObj());
            return;
        }

        // Quantity confirmed for receiver
        if (customId === "quantitySelectorReceiver") {
            const quantity = parseInt(values[0]);
            const card = pendingCardReceiver;
            pendingCardReceiver = null;
            if (card) {
                const sourceMap = removeCardModeReceiver ? cardsSelectedForTradeReciever : cardsReceiverHas;
                const destMap = removeCardModeReceiver ? cardsReceiverHas : cardsSelectedForTradeReciever;
                applyQuantity(card.id.toString(), quantity, sourceMap, destMap);
            }
            await selectInteraction.update(getReplyObj());
            return;
        }

        // Card selected (or pagination nav) — set pending and show quantity picker
        if (customId === "currentCardsForCurrentUserSelect" || customId === "otherUserCardsSelect") {
            const forSender = customId === "currentCardsForCurrentUserSelect";

            // Handle in-dropdown pagination
            if (values[0] === '__prev_page__') {
                if (forSender) currentCardPageForSenderCards = Math.max(0, currentCardPageForSenderCards - 1);
                else currentCardPageForReceiverCards = Math.max(0, currentCardPageForReceiverCards - 1);
                await selectInteraction.update(getReplyObj());
                return;
            }
            if (values[0] === '__next_page__') {
                if (forSender) currentCardPageForSenderCards++;
                else currentCardPageForReceiverCards++;
                await selectInteraction.update(getReplyObj());
                return;
            }

            const addCardMode = forSender ? addCardModeSender : addCardModeReceiver;
            const removeCardMode = forSender ? removeCardModeSender : removeCardModeReceiver;

            if (!addCardMode && !removeCardMode) {
                await selectInteraction.update(getReplyObj());
                return;
            }

            const sourceMap = removeCardMode
                ? (forSender ? cardsSelectedSender : cardsSelectedForTradeReciever)
                : (forSender ? cardsSenderHas : cardsReceiverHas);

            const card = sourceMap.get(values[0]);
            if (!card) {
                await selectInteraction.update(getReplyObj());
                return;
            }

            if (forSender) pendingCardSender = card;
            else pendingCardReceiver = card;

            await selectInteraction.update(getReplyObj());
            return;
        }

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
async function viewTradeRequests(interaction) {
    const userId = interaction.user.id;

    try {
        let page = 0;

        // --- Editor state ---
        let editingTradeId = null;
        let editCardsMineHas = new Map();
        let editCardsTheirsHas = new Map();
        let editCardsSelectedMine = new Map();
        let editCardsSelectedTheirs = new Map();
        let editAddModeMine = true;
        let editAddModeTheirs = true;
        let editRemoveModeMine = false;
        let editRemoveModeTheirs = false;
        let editPendingMine = null;
        let editPendingTheirs = null;
        let editPageMine = 0;
        let editPageTheirs = 0;

        const applyQuantityEdit = (cardId, quantity, sourceMap, destMap) => {
            const card = sourceMap.get(cardId);
            if (!card) return;
            const newCount = card.count - quantity;
            if (newCount <= 0) sourceMap.delete(cardId);
            else sourceMap.set(cardId, { ...card, count: newCount });
            const existing = destMap.get(cardId);
            destMap.set(cardId, { id: card.id, name: card.name, count: (existing ? existing.count : 0) + quantity });
        };

        const makeEditorWindow = (cardsHas, cardsSelected, addMode, removeMode, currentPage, isMine, pendingCard) => {
            const header = new TextDisplayBuilder()
                .setContent(isMine ? "## Your Counter-Offer" : "## You're Requesting")
                .setId(isMine ? 300 : 400);

            const selectedText = new TextDisplayBuilder()
                .setContent((isMine ? "Offering: " : "Requesting: ") +
                    (cardsSelected.size > 0
                        ? Array.from(cardsSelected.values()).map(c => `${c.name} (x${c.count})`).join(", ")
                        : "None"))
                .setId(isMine ? 301 : 401);

            const displayPool = removeMode ? cardsSelected : cardsHas;
            const cardArray = Array.from(displayPool.values());

            let selectorRow;
            if (pendingCard) {
                const maxQty = Math.min(pendingCard.count, 25);
                const quantitySelect = new StringSelectMenuBuilder()
                    .setCustomId(isMine ? "editMineQuantitySelect" : "editTheirsQuantitySelect")
                    .setPlaceholder(`How many ${pendingCard.name}? (${isMine ? "you have" : "they have"} ${pendingCard.count})`)
                    .setMinValues(1).setMaxValues(1)
                    .addOptions(Array.from({ length: maxQty }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })));
                selectorRow = new ActionRowBuilder().addComponents(quantitySelect);
            } else {
                const totalPages = Math.ceil(displayPool.size / 25) || 1;
                const hasPrev = currentPage > 0;
                const hasNext = (currentPage + 1) * 25 < displayPool.size;
                const navSlots = (hasPrev ? 1 : 0) + (hasNext ? 1 : 0);
                const pageSlice = cardArray.slice(currentPage * 25, currentPage * 25 + (25 - navSlots));
                const action = removeMode ? "Remove" : "Add";
                const options = pageSlice.map(c => ({ label: `${c.name} (x${c.count})`, value: c.id.toString() }));
                if (hasPrev) options.push({ label: `< Page ${currentPage} of ${totalPages}`, value: '__prev_page__' });
                if (hasNext) options.push({ label: `Page ${currentPage + 2} of ${totalPages} >`, value: '__next_page__' });

                const cardSelect = new StringSelectMenuBuilder()
                    .setCustomId(isMine ? "editMineCardSelect" : "editTheirsCardSelect")
                    .setPlaceholder(options.length === 0 ? 'No cards available' : `${action} a card — page ${currentPage + 1} of ${totalPages}`)
                    .setMinValues(1).setMaxValues(1)
                    .addOptions(options.length > 0 ? options : [{ label: 'No cards available', value: '__none__' }]);
                selectorRow = new ActionRowBuilder().addComponents(cardSelect);
            }

            const addRemoveRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(isMine ? "editAddMine" : "editAddTheirs").setLabel("Add Card").setStyle(addMode ? "Primary" : "Secondary"),
                new ButtonBuilder().setCustomId(isMine ? "editRemoveMine" : "editRemoveTheirs").setLabel("Remove Card").setStyle(removeMode ? "Danger" : "Secondary"),
            );

            return [header, selectedText, selectorRow, addRemoveRow];
        };

        const getEditorUI = () => {
            const mine = makeEditorWindow(editCardsMineHas, editCardsSelectedMine, editAddModeMine, editRemoveModeMine, editPageMine, true, editPendingMine);
            const theirs = makeEditorWindow(editCardsTheirsHas, editCardsSelectedTheirs, editAddModeTheirs, editRemoveModeTheirs, editPageTheirs, false, editPendingTheirs);
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("editBack").setLabel("Back").setStyle("Secondary"),
                new ButtonBuilder().setCustomId("editConfirm").setLabel("Send Counter-Offer").setStyle("Success"),
            );
            return { flags: 1 << 15 | 64, components: [...mine, ...theirs, actionRow] };
        };

        const createTradeView = async (curPage) => {
            const response = await axios.get(`${backendUrl}/trade/getAll`, { params: { discordID: userId } });

            if (!response.data || !Array.isArray(response.data)) {
                return { flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent("An error occurred while fetching trade requests.")] };
            }

            const trades = response.data;
            if (trades.length === 0) {
                return { flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent("You have no trade requests.")] };
            }

            const items = [new TextDisplayBuilder().setContent(`You have ${trades.length} trade request(s):`)];

            for (let i = curPage * 3; i < Math.min((curPage + 1) * 3, trades.length); i++) {
                const trade = trades[i];
                const isReceiver = trade.receivingUser.DiscordID === userId;
                const status = trade.completed ? "Completed" : trade.rejected ? "Rejected"
                    : isReceiver ? "Awaiting your response" : "Waiting for their response";

                const offeredCards = trade.offeredCards.map(c => `${c.card.Name} (x${c.quantity})`).join(", ");
                const requestedCards = trade.requestedCards.map(c => `${c.card.Name} (x${c.quantity})`).join(", ");

                const tradeText = isReceiver
                    ? `From: <@${trade.offeringUser.DiscordID}>\nThey offer: ${offeredCards}\nThey want: ${requestedCards}\nStatus: ${status}`
                    : `To: <@${trade.receivingUser.DiscordID}>\nYou offered: ${offeredCards}\nYou requested: ${requestedCards}\nStatus: ${status}`;

                const buttonRow = new ActionRowBuilder();
                if (!trade.completed && !trade.rejected && isReceiver) {
                    buttonRow.addComponents(
                        new ButtonBuilder().setCustomId(`acceptTrade_${trade._id}`).setLabel("Accept").setStyle("Success"),
                        new ButtonBuilder().setCustomId(`counterTrade_${trade._id}`).setLabel("Counter-Offer").setStyle("Primary"),
                    );
                }
                if (!trade.completed && !trade.rejected) {
                    buttonRow.addComponents(
                        new ButtonBuilder().setCustomId(`rejectTrade_${trade._id}`).setLabel(isReceiver ? "Reject" : "Cancel").setStyle("Danger"),
                    );
                }

                items.push(new ContainerBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(tradeText))
                    .addActionRowComponents(buttonRow));
            }

            const pageButtons = new ActionRowBuilder();
            if (curPage > 0) pageButtons.addComponents(new ButtonBuilder().setCustomId('prevPageTrades').setLabel('Previous Page').setStyle('Secondary'));
            if ((curPage + 1) * 3 < trades.length) pageButtons.addComponents(new ButtonBuilder().setCustomId('nextPageTrades').setLabel('Next Page').setStyle('Secondary'));
            if (pageButtons.components.length > 0) items.push(pageButtons);

            return { flags: 1 << 15 | 64, components: items };
        };

        const reply = await interaction.reply(await createTradeView(page));

        const buttonCollector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });
        const selectCollector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 600000 });

        buttonCollector.on('collect', async (buttonInteraction) => {
            const [action, tradeId] = buttonInteraction.customId.split('_');

            // Trade list actions
            if (action === 'acceptTrade') {
                try {
                    await axios.post(`${backendUrl}/trade/accept`, { tradeID: tradeId, callingUser: userId });
                    await buttonInteraction.update(await createTradeView(page));
                } catch (error) {
                    console.error("Error accepting trade:", error);
                    await buttonInteraction.update({ flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent("An error occurred while accepting the trade.")] });
                }
            } else if (action === 'rejectTrade') {
                try {
                    await axios.post(`${backendUrl}/trade/reject`, { tradeID: tradeId, callingUser: userId });
                    await buttonInteraction.update(await createTradeView(page));
                } catch (error) {
                    console.error("Error rejecting trade:", error);
                    await buttonInteraction.update({ flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent("An error occurred while rejecting the trade.")] });
                }
            } else if (action === 'nextPageTrades') {
                page++;
                await buttonInteraction.update(await createTradeView(page));
            } else if (action === 'prevPageTrades') {
                page--;
                await buttonInteraction.update(await createTradeView(page));

            // Open counter-offer editor
            } else if (action === 'counterTrade') {
                await buttonInteraction.deferUpdate();

                const allTrades = await axios.get(`${backendUrl}/trade/getAll`, { params: { discordID: userId } });
                const trade = allTrades.data.find(t => t._id === tradeId);
                if (!trade) { await buttonInteraction.editReply({ flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent("Trade not found.")] }); return; }

                const otherDiscordId = trade.offeringUser.DiscordID;
                const [callerRes, otherRes] = await Promise.all([
                    axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: userId } }),
                    axios.get(`${backendUrl}/user/cards`, { params: { DiscordID: otherDiscordId } }),
                ]);

                editCardsMineHas = new Map();
                callerRes.data.cards.forEach(c => editCardsMineHas.set(c._id, { id: c._id, name: c.Name, count: c.quantity }));

                editCardsTheirsHas = new Map();
                otherRes.data.cards.forEach(c => editCardsTheirsHas.set(c._id, { id: c._id, name: c.Name, count: c.quantity }));

                // Pre-populate from receiver's perspective:
                // their offer (what I give) = trade.requestedCards, my request (what I get) = trade.offeredCards
                editCardsSelectedMine = new Map();
                editCardsSelectedTheirs = new Map();

                for (const tc of trade.requestedCards) {
                    const id = tc.card._id;
                    const qty = tc.quantity;
                    editCardsSelectedMine.set(id, { id, name: tc.card.Name, count: qty });
                    const avail = editCardsMineHas.get(id);
                    if (avail) {
                        const n = avail.count - qty;
                        if (n <= 0) editCardsMineHas.delete(id);
                        else editCardsMineHas.set(id, { ...avail, count: n });
                    }
                }

                for (const tc of trade.offeredCards) {
                    const id = tc.card._id;
                    const qty = tc.quantity;
                    editCardsSelectedTheirs.set(id, { id, name: tc.card.Name, count: qty });
                    const avail = editCardsTheirsHas.get(id);
                    if (avail) {
                        const n = avail.count - qty;
                        if (n <= 0) editCardsTheirsHas.delete(id);
                        else editCardsTheirsHas.set(id, { ...avail, count: n });
                    }
                }

                editingTradeId = tradeId;
                editAddModeMine = true; editAddModeTheirs = true;
                editRemoveModeMine = false; editRemoveModeTheirs = false;
                editPendingMine = null; editPendingTheirs = null;
                editPageMine = 0; editPageTheirs = 0;

                await buttonInteraction.editReply(getEditorUI());

            // Editor actions
            } else if (buttonInteraction.customId === 'editBack') {
                editingTradeId = null;
                await buttonInteraction.update(await createTradeView(page));
            } else if (buttonInteraction.customId === 'editConfirm') {
                try {
                    await axios.post(`${backendUrl}/trade/edit`, {
                        tradeID: editingTradeId,
                        callingUser: userId,
                        offeredCards: Array.from(editCardsSelectedMine.values()).map(c => ({ card: c.id, quantity: c.count })),
                        requestedCards: Array.from(editCardsSelectedTheirs.values()).map(c => ({ card: c.id, quantity: c.count })),
                    });
                    editingTradeId = null;
                    await buttonInteraction.update(await createTradeView(page));
                } catch (error) {
                    console.error("Error sending counter-offer:", error);
                    await buttonInteraction.update({ flags: 1 << 15 | 64, components: [new TextDisplayBuilder().setContent(`Failed to send counter-offer: ${error.response?.data?.message || "Please try again."}`)] });
                }
            } else if (buttonInteraction.customId === 'editAddMine') {
                editAddModeMine = !editAddModeMine; editRemoveModeMine = false; editAddModeTheirs = false; editRemoveModeTheirs = false;
                await buttonInteraction.update(getEditorUI());
            } else if (buttonInteraction.customId === 'editRemoveMine') {
                editRemoveModeMine = !editRemoveModeMine; editAddModeMine = false; editAddModeTheirs = false; editRemoveModeTheirs = false;
                await buttonInteraction.update(getEditorUI());
            } else if (buttonInteraction.customId === 'editAddTheirs') {
                editAddModeTheirs = !editAddModeTheirs; editAddModeMine = false; editRemoveModeMine = false; editRemoveModeTheirs = false;
                await buttonInteraction.update(getEditorUI());
            } else if (buttonInteraction.customId === 'editRemoveTheirs') {
                editRemoveModeTheirs = !editRemoveModeTheirs; editAddModeMine = false; editRemoveModeMine = false; editAddModeTheirs = false;
                await buttonInteraction.update(getEditorUI());
            }
        });

        selectCollector.on('collect', async (selectInteraction) => {
            const { customId, values } = selectInteraction;

            if (customId === 'editMineQuantitySelect') {
                const qty = parseInt(values[0]);
                const card = editPendingMine;
                editPendingMine = null;
                if (card) applyQuantityEdit(card.id.toString(), qty, editRemoveModeMine ? editCardsSelectedMine : editCardsMineHas, editRemoveModeMine ? editCardsMineHas : editCardsSelectedMine);
                await selectInteraction.update(getEditorUI());
                return;
            }
            if (customId === 'editTheirsQuantitySelect') {
                const qty = parseInt(values[0]);
                const card = editPendingTheirs;
                editPendingTheirs = null;
                if (card) applyQuantityEdit(card.id.toString(), qty, editRemoveModeTheirs ? editCardsSelectedTheirs : editCardsTheirsHas, editRemoveModeTheirs ? editCardsTheirsHas : editCardsSelectedTheirs);
                await selectInteraction.update(getEditorUI());
                return;
            }

            if (customId === 'editMineCardSelect' || customId === 'editTheirsCardSelect') {
                const isMine = customId === 'editMineCardSelect';
                if (values[0] === '__none__') { await selectInteraction.update(getEditorUI()); return; }
                if (values[0] === '__prev_page__') {
                    if (isMine) editPageMine = Math.max(0, editPageMine - 1);
                    else editPageTheirs = Math.max(0, editPageTheirs - 1);
                    await selectInteraction.update(getEditorUI());
                    return;
                }
                if (values[0] === '__next_page__') {
                    if (isMine) editPageMine++;
                    else editPageTheirs++;
                    await selectInteraction.update(getEditorUI());
                    return;
                }

                const removeMode = isMine ? editRemoveModeMine : editRemoveModeTheirs;
                const sourceMap = removeMode
                    ? (isMine ? editCardsSelectedMine : editCardsSelectedTheirs)
                    : (isMine ? editCardsMineHas : editCardsTheirsHas);

                const card = sourceMap.get(values[0]);
                if (!card) { await selectInteraction.update(getEditorUI()); return; }

                if (isMine) editPendingMine = card;
                else editPendingTheirs = card;
                await selectInteraction.update(getEditorUI());
            }
        });

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
