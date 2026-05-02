const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../');

const config = getDefaultConfig(projectRoot);

// pnpm monorepo configuration
config.projectRoot = projectRoot;
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(projectRoot, 'app'),
  path.resolve(projectRoot, 'src'),
];

// Enable SVG file imports via react-native-svg-transformer
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Try to find the actual react-native installation
let rnPath;
try {
  rnPath = path.dirname(require.resolve('react-native/package.json'));
} catch (e) {
  rnPath = path.resolve(workspaceRoot, 'node_modules/react-native');
}

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  disableHierarchicalLookup: false,
  useWatchman: false,
  // Extra node modules to help resolve packages
  extraNodeModules: {
    'react-native': rnPath,
  },
};

// Clear caches
config.cacheStores = [];

module.exports = config;
