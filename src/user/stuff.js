const { SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, ComponentType , StringSelectMenuBuilder, ContainerBuilder, } = require('discord.js');




async function makeTradeRequestReply (interaction){
    //i do not expect this to work first try
    const fun = async () => {

        const row = new ActionRowBuilder()

        const yourContainer = new ContainerBuilder().setId('your-container')

        const theirContainer = new ContainerBuilder().setId('their-container')

        const buttonContainer = new ContainerBuilder().setId('button-container')

        yourContainer.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('your-cards')
                .setPlaceholder('Select your cards')
                .addOptions([   
                    {
                        label: 'Card 1',
                        value: 'card1',
                    },
                    {
                        label: 'Card 2',
                        value: 'card2',
                    },
                    {
                        label: 'Card 3',
                        value: 'card3',
                    }
                ]).setMinValues(0)
        );

        theirContainer.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('their-cards')
                .setPlaceholder('Select their cards')
                .addOptions([
                    {
                        label: 'Card A',
                        value: 'cardA',
                    },
                    {
                        label: 'Card B',
                        value: 'cardB',
                    },
                    {
                        label: 'Card C',
                        value: 'cardC',
                    }
                ]).setMinValues(0)
        );


        buttonContainer.addComponents(
            new ButtonBuilder()
                .setCustomId('submit-trade')
                .setLabel('Submit Trade')
                .setStyle('PRIMARY')
        );
        buttonContainer.addComponents(
            new ButtonBuilder()
                .setCustomId('cancel-trade')
                .setLabel('Cancel Trade')
                .setStyle('DANGER')
        );

        row.addComponents(yourContainer, theirContainer, buttonContainer);


        const messageSent = await interaction.reply({
            content: 'Trade Request',
            components: [row],
            ephemeral: true
        });

        const filter = i => i.customId === 'submit-trade' || i.customId === 'cancel-trade';
        const collector = messageSent.createMessageComponentCollector({ filter, time: 60*5*1000 }); // 5 minutes


       collector.on('collect', async i => {
           if (i.customId === 'submit-trade') {
               await i.reply({ content: 'Trade submitted!', ephemeral: true });
                const yourCards = interaction.message.components[0].components[0].values;
                const theirCards = interaction.message.components[0].components[1].values; 
                console.log(`Your cards: ${yourCards}, Their cards: ${theirCards}`);
                messageSent.edit({
                    content: `Trade submitted! Your cards: ${yourCards.join(', ')}, Their cards: ${theirCards.join(', ')}`,
                    components: []
                });
           } else if (i.customId === 'cancel-trade') {
               await i.reply({ content: 'Trade canceled.', ephemeral: true });
                messageSent.edit({
                     content: 'Trade canceled.',
                     components: []
                });
           }
       });

       

       collector.on('end', collected => {
           if (collected.size === 0) {
                messageSent.edit({
                     content: 'Trade request timed out.',
                     components: []
                });
           }
       });





    }
    fun().catch(err => {
        console.error("Error in makeTradeRequestReply:", err);
        interaction.reply({ content: 'An error occurred while processing the trade request.', ephemeral: true });
    });
}