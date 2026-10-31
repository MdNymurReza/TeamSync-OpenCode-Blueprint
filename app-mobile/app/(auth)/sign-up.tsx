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

import { Button, Card, ErrorView, IconTile, Input } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, radii, spacing, typography } from '@/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!university.trim()) {
      setErrorMessage('Please enter your university or college name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid student email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp({
      fullName: fullName.trim(),
      university: university.trim(),
      department: department.trim() || undefined,
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        'Account created successfully! If email verification is enabled on your Supabase project, check your inbox.'
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
          <IconTile name="person-add-outline" tone="primary" size={48} style={styles.brandTile} />
          <Text style={styles.title} accessibilityRole="header">
            Create Your Account
          </Text>
          <Text style={styles.subtitle}>
            Join student workspaces to organize projects, milestones, and meeting minutes.
          </Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
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
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.successTitle}>Registration Complete</Text>
              </View>
              <Text style={styles.successBody}>{successMessage}</Text>
              <Button
                title="Go to Sign In"
                onPress={() => router.replace('/(auth)/sign-in')}
                variant="primary"
                size="sm"
                style={styles.successAction}
              />
            </View>
          ) : null}

          <Text style={styles.groupLabel}>Student Profile</Text>

          <Input
            label="Full Name"
            placeholder="Ada Lovelace"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
          />

          <Input
            label="University / Institution"
            placeholder="e.g. University of Melbourne"
            value={university}
            onChangeText={setUniversity}
            leftIcon={<Ionicons name="school-outline" size={18} color={colors.textSecondary} />}
          />

          <Input
            label="Department / Major (Optional)"
            placeholder="e.g. Computer Science"
            value={department}
            onChangeText={setDepartment}
            leftIcon={<Ionicons name="book-outline" size={18} color={colors.textSecondary} />}
          />

          <Text style={[styles.groupLabel, styles.groupLabelSpaced]}>Credentials</Text>

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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
            helperText="Minimum 6 characters."
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />

          <Button
            title="Create Account"
            onPress={handleSubmit}
            loading={isSubmitting}
            variant="primary"
            size="lg"
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already registered?</Text>
          <Button
            title="Sign In to Existing Account"
            onPress={() => router.back()}
            variant="secondary"
            size="md"
            style={styles.signInButton}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  brandTile: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  formCard: {
    marginBottom: spacing.base,
  },
  groupLabel: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  groupLabelSpaced: {
    marginTop: spacing.xs,
  },
  banner: {
    marginBottom: spacing.base,
  },
  successCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
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
    marginBottom: spacing.sm,
  },
  successAction: {
    alignSelf: 'flex-start',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  signInButton: {
    width: '100%',
  },
});
