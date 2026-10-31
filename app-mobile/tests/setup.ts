// Mock vector icons in Jest to avoid font asset loading overhead
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return function MockIonicons(props: { name?: string; testID?: string }) {
    return React.createElement(
      Text,
      { testID: props.testID ?? props.name },
      props.name ?? 'icon'
    );
  };
});

jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons(props: { name?: string; testID?: string }) {
      return React.createElement(
        Text,
        { testID: props.testID ?? props.name },
        props.name ?? 'icon'
      );
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
