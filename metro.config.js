const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for .cjs files
defaultConfig.resolver.sourceExts.push('cjs');

// Disable package exports to avoid conflicts
defaultConfig.resolver.unstable_enablePackageExports = false;

// Ensure proper module resolution
defaultConfig.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add explicit watch folders
defaultConfig.watchFolders = [
  __dirname,
  __dirname + '/app',
  __dirname + '/src'
];

// Ensure proper resolver configuration
defaultConfig.resolver.nodeModulesPaths = [
  __dirname + '/node_modules'
];

module.exports = defaultConfig; 