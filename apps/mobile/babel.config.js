module.exports = function (api) {
  const isTest = process.env.NODE_ENV === 'test';
  api.cache(() => process.env.NODE_ENV);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(isTest ? [] : ['@tamagui/babel-plugin']),
      ['react-native-reanimated/plugin'],
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      '@babel/plugin-transform-runtime',
    ],
  };
};
