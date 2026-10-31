/**
 * MelBond Design System Tokens
 *
 * Adheres to docs/Design.md:
 * - 8-point spacing rhythm
 * - Neutral surface palette with restrained indigo brand accent
 * - High-contrast accessible text (>4.5:1 ratio for WCAG AA)
 * - Semantic states with text + color pairing
 * - Accessible minimum touch targets (>= 48pt)
 */

export const colors = {
  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  surfaceHover: '#E2E8F0',

  // Borders
  border: '#E2E8F0',
  borderMuted: '#CBD5E1',
  borderFocus: '#4F46E5',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  // Brand Accent (Indigo)
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  primaryBorder: '#C7D2FE',

  // Semantic Statuses (WCAG AA compliant)
  success: '#16A34A',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  successText: '#15803D',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#B45309',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#B91C1C',

  info: '#0284C7',
  infoBg: '#F0F9FF',
  infoBorder: '#BAE6FD',
  infoText: '#0369A1',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  titleLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  titleMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  titleSmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
} as const;

export const touchTargets = {
  minTouchSize: 48,
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;
