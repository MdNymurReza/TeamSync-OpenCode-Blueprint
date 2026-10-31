import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radii } from '@/theme';

export type IconTileTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface IconTileProps {
  name: keyof typeof Ionicons.glyphMap;
  tone?: IconTileTone;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const toneMap: Record<IconTileTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primaryLight, fg: colors.primary },
  success: { bg: colors.successBg, fg: colors.successText },
  warning: { bg: colors.warningBg, fg: colors.warningText },
  danger: { bg: colors.dangerBg, fg: colors.dangerText },
  info: { bg: colors.infoBg, fg: colors.infoText },
  neutral: { bg: colors.surfaceSubtle, fg: colors.textSecondary },
};

/** Decorative rounded-square icon container for list rows and cards. */
export function IconTile({ name, tone = 'primary', size = 40, style }: IconTileProps) {
  const palette = toneMap[tone];
  return (
    <View
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: palette.bg },
        style,
      ]}
    >
      <Ionicons name={name} size={Math.round(size * 0.5)} color={palette.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

