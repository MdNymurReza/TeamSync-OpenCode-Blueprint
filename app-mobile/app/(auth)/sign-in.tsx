import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ErrorView, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const melbondLogo = require('../../assets/logo.png');

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(trimmedEmail, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View pointerEvents="none" style={styles.ambientTopRight} />
      <View pointerEvents="none" style={styles.ambientBottomLeft} />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top, spacing.lg) + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="scrollview"
      >
        <View style={styles.header}>
          <View style={styles.brandLogoCard}>
            <Image
              source={melbondLogo}
              style={styles.brandLogoImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.eyebrowPill}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>MelBond</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Welcome to MelBond
          </Text>
          <Text style={styles.subtitle}>
            Sign in to access your student project workspaces.
          </Text>
        </View>

        {!isConfigured ? (
          <Card style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.info} />
              <Text style={styles.noticeTitle}>Supabase Setup Required</Text>
            </View>
            <Text style={styles.noticeBody}>
              Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env.local file to connect to live authentication.
            </Text>
          </Card>
        ) : null}

        <Card style={styles.formCard} variant="elevated">
          {errorMessage ? (
            <ErrorView
              message={errorMessage}
              inline={true}
              style={styles.errorBanner}
            />
          ) : null}

          <Input
            label="Email Address"
            placeholder="student@university.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />

          <View style={styles.forgotContainer}>
            <Button
              title="Forgot password?"
              onPress={() => router.push('/(auth)/reset-password')}
              variant="text"
              size="sm"
            />
          </View>

          <Button
            title="Sign In"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            size="lg"
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account yet?"}</Text>
          <Button
            title="Create an Account"
            onPress={() => router.push('/(auth)/sign-up')}
            variant="secondary"
            size="md"
            style={styles.signUpButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  ambientTopRight: {
    position: 'absolute',
    top: -100,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E0F2FE',
    opacity: 0.65,
  },
  ambientBottomLeft: {
    position: 'absolute',
    bottom: -90,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#CCFBF1',
    opacity: 0.55,
  },
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  brandLogoCard: {
    width: 84,
    height: 84,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  brandLogoImage: {
    width: 68,
    height: 68,
  },
  eyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.xs,
    gap: 6,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brandMint,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  noticeCard: {
    marginBottom: spacing.base,
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  noticeTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.infoText,
    marginLeft: spacing.xs,
  },
  noticeBody: {
    ...typography.bodyMedium,
    color: colors.infoText,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  errorBanner: {
    marginBottom: spacing.base,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  signUpButton: {
    width: '100%',
  },
});
