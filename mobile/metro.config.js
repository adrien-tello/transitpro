// Lets the app import the shared API types and mock data from ../contracts
// (import { tripSearchResults } from '@contracts/mocks').
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../contracts')];

module.exports = config;
