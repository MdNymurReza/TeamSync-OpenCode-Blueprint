import { colors, typography } from './tokens';

/**
 * Shared native-stack header options so every pushed screen has the same
 * calm, hairline-free header treatment (Phase 5.5 visual polish).
 */
export const stackScreenOptions = {
  headerStyle: {
    backgroundColor: colors.background,
  },
  headerTitleStyle: {
    fontSize: typography.titleSmall.fontSize,
    fontWeight: typography.titleSmall.fontWeight,
    color: colors.textPrimary,
  },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: {
    backgroundColor: colors.background,
  },
};

