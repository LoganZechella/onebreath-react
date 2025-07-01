// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '..', 'shared'),
];

config.resolver.nodeModulesPath = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

module.exports = withNativeWind(config, {
  input: './global.css',
});