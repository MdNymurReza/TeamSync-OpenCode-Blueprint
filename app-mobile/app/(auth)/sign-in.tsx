import React, { useState } from 'react';
import {
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

import { Button, Card, ErrorView, IconTile, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

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
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top, spacing.lg) + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="scrollview"
      >
        <View style={styles.header}>
          <IconTile name="layers-outline" tone="primary" size={56} style={styles.brandTile} />
          <Text style={styles.eyebrow}>MelBond</Text>
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
  container: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  brandTile: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
    marginBottom: spacing.xs,
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
