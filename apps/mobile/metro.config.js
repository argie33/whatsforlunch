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

// Stub out native modules that don't work in web context
const fs = require('fs');
const path_module = require('path');
const emptyStub = path_module.resolve(projectRoot, 'src/lib/empty-module-stub.ts');

// List of native-only modules that need to be stubbed out for web bundling
const nativeOnlyModules = new Set([
  'better-sqlite3',
  'sql.js',
  '@react-native-async-storage/async-storage',
]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // For web platform, stub out native modules
  if (platform === 'web' && nativeOnlyModules.has(moduleName)) {
    return { filePath: emptyStub, type: 'sourceFile' };
  }
  // Fall back to original resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Clear caches
config.cacheStores = [];

module.exports = config;
