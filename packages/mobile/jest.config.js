module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!.*(react-native|@react-native|expo|@expo|@shopify/react-native-skia|@shopify\\+react-native-skia|react-navigation|@react-navigation|@testing-library/react-native))',
  ],
  moduleNameMapper: {
    '^@partylight/core$': '<rootDir>/../core/src/index.ts',
  },
};
