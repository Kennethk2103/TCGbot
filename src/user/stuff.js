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
                .setCustomId('your-select')
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
                    },
                ])
        );

        theirContainer.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('their-select')
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
                    },
                ])
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


    
       




    }
}