import { colors, radii, shadows, spacing, touchTargets, typography } from '@/theme';

describe('Design Tokens (Phase 1)', () => {
  it('defines an 8-point spacing rhythm', () => {
    expect(spacing.none).toBe(0);
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.base).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(40);
    expect(spacing.xxxl).toBe(48);
  });

  it('enforces a minimum touch target >= 48 for mobile accessibility', () => {
    expect(touchTargets.minTouchSize).toBeGreaterThanOrEqual(48);
  });

  it('defines required neutral surfaces and brand accent', () => {
    expect(colors.background).toBe('#F8FAFC');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.primary).toBe('#4F46E5');
    expect(colors.textPrimary).toBe('#0F172A');
  });

  it('defines semantic status colors with paired background and text', () => {
    expect(colors.success).toBeDefined();
    expect(colors.successBg).toBeDefined();
    expect(colors.successText).toBeDefined();

    expect(colors.warning).toBeDefined();
    expect(colors.warningBg).toBeDefined();
    expect(colors.warningText).toBeDefined();

    expect(colors.danger).toBeDefined();
    expect(colors.dangerBg).toBeDefined();
    expect(colors.dangerText).toBeDefined();

    expect(colors.info).toBeDefined();
    expect(colors.infoBg).toBeDefined();
    expect(colors.infoText).toBeDefined();
  });

  it('provides typography scale and radii tokens', () => {
    expect(typography.titleLarge.fontSize).toBe(24);
    expect(typography.bodyLarge.fontSize).toBe(16);
    expect(radii.md).toBe(8);
    expect(radii.full).toBe(9999);
    expect(shadows.card).toBeDefined();
  });
});
