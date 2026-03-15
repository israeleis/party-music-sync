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

// Map the workspace package name directly to its source entry point
// (avoids relying on the symlink + package.json "exports" resolution chain)
config.resolver.extraNodeModules = {
  '@partylight/core': path.resolve(workspaceRoot, 'packages/core/src/index.ts'),
};

module.exports = config;
