import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radii, shadows, spacing, typography } from '@/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 3400;

interface ActiveToast extends ToastOptions {
  id: string;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [activeToast, setActiveToast] = useState<ActiveToast | null>(null);

  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = useCallback((type: ToastType) => {
    try {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {
      // Gracefully continue on unsupported environments
    }
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (input: ToastOptions | string) => {
      const opts: ToastOptions = typeof input === 'string' ? { message: input } : input;
      const type: ToastType = opts.type ?? 'info';
      const duration = opts.durationMs ?? DEFAULT_DURATION_MS;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      triggerHaptic(type);

      const toastItem: ActiveToast = {
        ...opts,
        type,
        id: `${Date.now()}-${Math.random()}`,
      };

      setActiveToast(toastItem);

      // Smooth slide-in
      translateY.setValue(-80);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacity, translateY, triggerHaptic]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showToast({ type: 'success', message, title });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      showToast({ type: 'error', message, title });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showToast({ type: 'info', message, title });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showToast({ type: 'warning', message, title });
    },
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const currentType = activeToast?.type ?? 'info';
  const typeConfig: Record<
    ToastType,
    { icon: keyof typeof Ionicons.glyphMap; color: string; border: string; bg: string }
  > = {
    success: {
      icon: 'checkmark-circle',
      color: colors.brandMint,
      border: 'rgba(16, 185, 129, 0.35)',
      bg: '#0F291E',
    },
    error: {
      icon: 'alert-circle',
      color: colors.danger,
      border: 'rgba(239, 68, 68, 0.35)',
      bg: '#2A1215',
    },
    warning: {
      icon: 'warning',
      color: colors.warning,
      border: 'rgba(245, 158, 11, 0.35)',
      bg: '#2B200E',
    },
    info: {
      icon: 'information-circle',
      color: colors.primary,
      border: 'rgba(2, 132, 199, 0.35)',
      bg: '#0B2238',
    },
  };

  const currentCfg = typeConfig[currentType];
  const topPosition = Math.max(insets.top, 12) + 6;

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        hideToast,
      }}
    >
      {children}

      {activeToast ? (
        <Animated.View
          testID="app-toast"
          accessibilityRole="alert"
          accessibilityLabel={`${activeToast.type} notification: ${activeToast.title ? activeToast.title + ' ' : ''}${activeToast.message}`}
          style={[
            styles.toastContainer,
            {
              top: topPosition,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Pressable
            testID="app-toast-dismiss"
            onPress={hideToast}
            style={[
              styles.toastCard,
              {
                backgroundColor: currentCfg.bg,
                borderColor: currentCfg.border,
              },
            ]}
          >
            <Ionicons name={currentCfg.icon} size={22} color={currentCfg.color} />
            <View style={styles.toastTextCol}>
              {activeToast.title ? (
                <Text style={styles.toastTitle} numberOfLines={1}>
                  {activeToast.title}
                </Text>
              ) : null}
              <Text style={styles.toastMessage} numberOfLines={2}>
                {activeToast.message}
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={hideToast}
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.7)" />
            </Pressable>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const NOOP_TOAST: ToastContextValue = {
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showWarning: () => {},
  hideToast: () => {},
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? NOOP_TOAST;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.raised,
  },
  toastTextCol: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toastMessage: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
