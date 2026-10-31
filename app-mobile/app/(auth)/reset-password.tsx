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
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Card, ErrorView, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, radii, spacing, typography } from '@/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(trimmedEmail);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        'Password reset instructions have been sent to your email address.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="scrollview"
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Password Recovery
          </Text>
          <Text style={styles.subtitle}>
            Enter your student email to receive a secure recovery link.
          </Text>
        </View>

        <Card style={styles.formCard}>
          {errorMessage ? (
            <ErrorView
              message={errorMessage}
              inline={true}
              style={styles.banner}
            />
          ) : null}

          {successMessage ? (
            <View style={styles.successCard} accessibilityRole="alert">
              <View style={styles.successHeader}>
                <Ionicons name="mail-unread-outline" size={20} color={colors.success} />
                <Text style={styles.successTitle}>Instructions Dispatched</Text>
              </View>
              <Text style={styles.successBody}>{successMessage}</Text>
            </View>
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

          <Button
            title="Send Recovery Link"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            size="lg"
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Button
            title="Return to Sign In"
            onPress={() => router.back()}
            variant="text"
            size="md"
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
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.base,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  formCard: {
    marginBottom: spacing.base,
  },
  banner: {
    marginBottom: spacing.base,
  },
  successCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  successTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.successText,
    marginLeft: spacing.xs,
  },
  successBody: {
    ...typography.bodyMedium,
    color: colors.successText,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
