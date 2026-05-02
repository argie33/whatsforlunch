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

// Get react-native paths from the actual pnpm installation
const rnModuleDir = path.dirname(require.resolve('react-native/package.json'));

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  // Disable hierarchical lookup to avoid issues with pnpm symlinks
  disableHierarchicalLookup: true,
  useWatchman: false,
};

module.exports = config;
