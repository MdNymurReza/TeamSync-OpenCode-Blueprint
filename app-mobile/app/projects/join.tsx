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
import { projectsService } from '@/features/projects';
import { colors, spacing, typography } from '@/theme';

export default function JoinProjectScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    setErrorMessage(null);
    const cleanedCode = code.trim().toUpperCase();

    if (!cleanedCode) {
      setErrorMessage('Please enter an invitation code.');
      return;
    }

    if (cleanedCode.length < 4) {
      setErrorMessage('Invitation code is too short.');
      return;
    }

    setIsSubmitting(true);
    const { data: projectId, error } = await projectsService.redeemInvitation(cleanedCode);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (projectId) {
      router.replace(`/(tabs)/projects`);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="scrollview"
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Join Workspace
          </Text>
          <Text style={styles.subtitle}>
            Enter the 6-character invitation code provided by your project team.
          </Text>
        </View>

        {errorMessage ? (
          <ErrorView
            message={errorMessage}
            inline
            style={styles.error}
          />
        ) : null}

        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>

          <Input
            label="Invitation Code"
            value={code}
            onChangeText={(val) => setCode(val.toUpperCase())}
            placeholder="e.g. 7K2M9X"
            autoCapitalize="characters"
            autoCorrect={false}
            helperText="Case-insensitive 6-character alphanumeric code"
            accessibilityLabel="Invitation Code"
            autoFocus
          />

          <Button
            title="Join Project"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            onPress={handleJoin}
            style={styles.submitBtn}
            accessibilityLabel="Submit Join Project"
          />

          <Button
            title="Cancel"
            variant="text"
            size="md"
            onPress={() => router.back()}
            style={styles.cancelBtn}
            accessibilityLabel="Cancel"
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
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
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  error: {
    marginBottom: spacing.base,
  },
  card: {
    padding: spacing.base,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  cancelBtn: {
    marginTop: spacing.xs,
  },
});
