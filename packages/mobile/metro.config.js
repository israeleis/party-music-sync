const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro sees changes in packages/core
config.watchFolders = [workspaceRoot];

// pnpm uses a virtual store — include it so Metro can resolve hoisted deps
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Required for pnpm's symlink-based workspace packages
config.resolver.unstable_enableSymlinks = true;

// Ensure Metro can bundle TypeScript source files from workspace packages
const { sourceExts, assetExts } = config.resolver;
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'mjs', 'cjs'];

// Map the workspace package name directly to its TypeScript source entry point.
// This bypasses the package.json "exports" field which Metro doesn't fully support.
config.resolver.extraNodeModules = {
  '@partylight/core': path.resolve(workspaceRoot, 'packages/core/src/index.ts'),
};


module.exports = config;
