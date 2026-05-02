const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  // Enable hierarchical lookup for pnpm
  disableHierarchicalLookup: false,
  // Extra node modules for pnpm compatibility
  extraNodeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        // Check workspace node_modules first, then project node_modules
        const wsPath = path.resolve(workspaceRoot, `node_modules/${name}`);
        const projPath = path.resolve(projectRoot, `node_modules/${name}`);

        if (fs.existsSync(wsPath)) {
          return wsPath;
        }
        if (fs.existsSync(projPath)) {
          return projPath;
        }
        return null;
      },
    },
  ),
};

module.exports = config;
