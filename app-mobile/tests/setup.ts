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

// Safe-area insets: use the library's official Jest mock (zero insets, no provider required).
jest.mock('react-native-safe-area-context', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-safe-area-context/jest/mock').default
);

// Expo native pickers mocks
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///test-gallery-image.jpg' }],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///test-camera-image.jpg' }],
  }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///test-picked-doc.pdf',
        name: 'test-picked-doc.pdf',
        mimeType: 'application/pdf',
        size: 1048576,
      },
    ],
  }),
}));
