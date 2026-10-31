/**
 * MelBond Design System Tokens
 *
 * Adheres to docs/Design.md:
 * - 8-point spacing rhythm
 * - Neutral surface palette with restrained indigo brand accent
 * - High-contrast accessible text (>4.5:1 ratio for WCAG AA)
 * - Semantic states with text + color pairing
 * - Accessible minimum touch targets (>= 48pt)
 *
 * Phase 5.5 (visual polish): refined type scale (display/overline/label),
 * softer elevation, larger corner radii, and a deterministic avatar palette.
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
  divider: '#EEF2F6',

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

/**
 * Avatar background palette. Every color meets >= 4.5:1 contrast with white
 * initials text. Selection is deterministic per name (see Avatar component).
 */
export const avatarPalette = [
  '#4F46E5', // indigo-600
  '#0369A1', // sky-700
  '#047857', // emerald-700
  '#B45309', // amber-700
  '#BE123C', // rose-700
  '#7C3AED', // violet-600
  '#0F766E', // teal-700
  '#475569', // slate-600
] as const;

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
  xxl: 20,
  full: 9999,
} as const;

export const typography = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  titleLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  titleMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  titleSmall: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
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
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
} as const;

export const touchTargets = {
  minTouchSize: 48,
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  raised: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;
