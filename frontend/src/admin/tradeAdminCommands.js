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

module.exports = {
  adminTradeCommands: commandsUser,
  adminTradeCommandMap: commandMap
};