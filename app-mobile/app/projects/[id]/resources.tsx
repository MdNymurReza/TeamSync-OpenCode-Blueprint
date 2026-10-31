import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorView,
  IconTile,
  Input,
  LoadingView,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import { milestonesService, MilestoneWithDetails } from '@/features/milestones';
import { projectsService, ProjectWithRole } from '@/features/projects';
import {
  formatFileSize,
  RESOURCE_CATEGORY_OPTIONS,
  ResourceCategory,
  ResourceListFilter,
  resourcesService,
  ResourceType,
  ResourceWithDetails,
} from '@/features/resources';
import { colors, radii, spacing, typography } from '@/theme';

const UPLOAD_MIME_PRESETS = [
  { label: 'Markdown (.md)', mimeType: 'text/markdown', ext: '.md' },
  { label: 'Text (.txt)', mimeType: 'text/plain', ext: '.txt' },
  { label: 'CSV Dataset (.csv)', mimeType: 'text/csv', ext: '.csv' },
  { label: 'JSON (.json)', mimeType: 'application/json', ext: '.json' },
  { label: 'PDF Document (.pdf)', mimeType: 'application/pdf', ext: '.pdf' },
] as const;

export default function ProjectResourcesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectWithRole | null>(null);
  const [resources, setResources] = useState<ResourceWithDetails[]>([]);
  const [milestones, setMilestones] = useState<MilestoneWithDetails[]>([]);
  const [activeFilter, setActiveFilter] = useState<ResourceListFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openingResourceId, setOpeningResourceId] = useState<string | null>(null);

  // Add Resource Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resourceType, setResourceType] = useState<ResourceType>('external_link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('research');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  // External link fields
  const [externalUrl, setExternalUrl] = useState('');

  // Private file upload fields
  const [fileName, setFileName] = useState('architecture-notes.md');
  const [mimeType, setMimeType] = useState<string>('text/markdown');
  const [fileContent, setFileContent] = useState('');
  const [pickedFile, setPickedFile] = useState<{
    name: string;
    size: number;
    uri: string;
    mimeType: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setErrorMessage(null);

    const [projRes, resRes, msRes] = await Promise.all([
      projectsService.fetchProjectDetails(id),
      resourcesService.fetchProjectResources(id, activeFilter),
      milestonesService?.fetchProjectMilestones
        ? milestonesService.fetchProjectMilestones(id)
        : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
    ]);

    if (projRes.error) {
      setErrorMessage(projRes.error.message);
    } else {
      setProject(projRes.data);
    }

    if (resRes.error) {
      setErrorMessage(resRes.error.message);
    } else {
      setResources(resRes.data ?? []);
    }

    if (msRes.data) {
      setMilestones(msRes.data);
    }

    setIsLoading(false);
  }, [id, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      const [projRes, resRes, msRes] = await Promise.all([
        projectsService.fetchProjectDetails(id),
        resourcesService.fetchProjectResources(id, activeFilter),
        milestonesService?.fetchProjectMilestones
          ? milestonesService.fetchProjectMilestones(id)
          : Promise.resolve({ data: [] as MilestoneWithDetails[], error: null }),
      ]);
      if (!isMounted) return;

      if (projRes.error) {
        setErrorMessage(projRes.error.message);
      } else {
        setProject(projRes.data);
      }
      if (resRes.error) {
        setErrorMessage(resRes.error.message);
      } else {
        setResources(resRes.data ?? []);
      }
      if (msRes.data) {
        setMilestones(msRes.data);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [id, activeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const isOwnerOrAdmin =
    project?.currentUserRole === 'owner' || project?.currentUserRole === 'admin';

  const openAddModal = (initialType: ResourceType = 'external_link') => {
    setResourceType(initialType);
    setTitle('');
    setDescription('');
    setCategory(initialType === 'external_link' ? 'research' : 'reports');
    setCustomCategory('');
    setSelectedMilestoneId(null);
    setExternalUrl('');
    setFileName('architecture-notes.md');
    setMimeType('text/markdown');
    setFileContent('');
    setPickedFile(null);
    setFormError(null);
    setIsModalVisible(true);
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf', 'text/*', 'application/json', 'image/*', '*/*'],
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        setPickedFile({
          name: asset.name,
          size: asset.size ?? 0,
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'application/pdf',
        });
        setFileName(asset.name);
        if (asset.mimeType) {
          setMimeType(asset.mimeType);
        }
        if (!title.trim() && asset.name) {
          setTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
        setFormError(null);
      }
    } catch {
      setFormError('Could not open document picker on device.');
    }
  };

  const handleSaveResource = async () => {
    if (!id) return;
    if (!title.trim()) {
      setFormError('Resource title is required');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    if (resourceType === 'external_link') {
      const { error } = await resourcesService.createExternalResource(id, {
        title: title.trim(),
        external_url: externalUrl.trim(),
        category,
        custom_category: category === 'other' ? customCategory.trim() || null : null,
        description: description.trim() || null,
        milestone_id: selectedMilestoneId,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsModalVisible(false);
        fetchData();
      }
    } else {
      let uploadContent: string | Uint8Array = fileContent || (pickedFile ? `[Uploaded file: ${pickedFile.name}]` : '');
      if (pickedFile?.uri) {
        try {
          const resp = await fetch(pickedFile.uri);
          const buf = await resp.arrayBuffer();
          uploadContent = new Uint8Array(buf);
        } catch {
          // Keep string fallback
        }
      }

      const { error } = await resourcesService.uploadFileResource(id, {
        title: title.trim(),
        fileName: fileName.trim(),
        mimeType,
        content: uploadContent,
        category,
        custom_category: category === 'other' ? customCategory.trim() || null : null,
        description: description.trim() || null,
        milestone_id: selectedMilestoneId,
      });
      setIsSaving(false);

      if (error) {
        setFormError(error.message);
      } else {
        setIsModalVisible(false);
        fetchData();
      }
    }
  };

  const handleOpenResource = async (res: ResourceWithDetails) => {
    if (!id) return;

    if (res.resource_type === 'external_link' && res.external_url) {
      try {
        await Linking.openURL(res.external_url);
      } catch {
        Alert.alert('Cannot Open Link', `URL: ${res.external_url}`);
      }
      return;
    }

    if (res.resource_type === 'file_upload') {
      setOpeningResourceId(res.id);
      const { data, error } = await resourcesService.createSignedDownloadUrl(res, id);
      setOpeningResourceId(null);

      if (error || !data) {
        Alert.alert('Download Blocked', error?.message ?? 'Could not generate signed URL');
        return;
      }

      try {
        await Linking.openURL(data.signedUrl);
      } catch {
        Alert.alert(
          'Signed Download Ready',
          `Temporary link valid for ${Math.round(data.expiresInSeconds / 60)} minutes.`
        );
      }
    }
  };

  const handleDeleteResource = (res: ResourceWithDetails) => {
    Alert.alert(
      'Delete Resource',
      `Are you sure you want to remove "${res.title}" from the workspace?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await resourcesService.deleteResource(res);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) {
    return <LoadingView message="Loading resource hub..." />;
  }

  if (errorMessage || !project) {
    return (
      <View style={styles.container}>
        <ErrorView
          title="Cannot load resources"
          message={errorMessage ?? 'Project not found.'}
          onRetry={() => fetchData()}
          style={styles.errorContainer}
        />
      </View>
    );
  }

  const linkCount = resources.filter((r) => r.resource_type === 'external_link').length;
  const uploadCount = resources.filter((r) => r.resource_type === 'file_upload').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        accessibilityRole="scrollview"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard} variant="elevated">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleCol}>
              <Text style={styles.projectSubtitle}>{project.name}</Text>
              <Text style={styles.screenTitle} accessibilityRole="header">
                Resource Hub
              </Text>
            </View>
            <View style={styles.headerActionBtns}>
              <Button
                title="Add Link"
                variant="soft"
                size="sm"
                leftIcon={<Ionicons name="link-outline" size={15} color={colors.primary} />}
                onPress={() => openAddModal('external_link')}
                accessibilityLabel="Add external link resource"
              />
              <Button
                title="Upload File"
                variant="primary"
                size="sm"
                leftIcon={
                  <Ionicons
                    name="cloud-upload-outline"
                    size={15}
                    color={colors.surface}
                  />
                }
                onPress={() => openAddModal('file_upload')}
                accessibilityLabel="Upload private project file"
              />
            </View>
          </View>

          <Text style={styles.securityCaption}>
            Uploads are stored in a private project bucket (max 10 MB) and accessed via
            short-lived signed URLs restricted to active team members.
          </Text>

          <View style={styles.summaryMetaRow}>
            <Badge label={`${linkCount} External Links`} variant="info" size="sm" />
            <Badge label={`${uploadCount} Private Files`} variant="primary" size="sm" />
          </View>
        </Card>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            hitSlop={6}
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === 'all' }}
            accessibilityLabel="Filter All resources"
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          {RESOURCE_CATEGORY_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.category;
            return (
              <Pressable
                key={opt.category}
                hitSlop={6}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(opt.category)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter ${opt.label} resources`}
              >
                <Text
                  style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Resource List */}
        {resources.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              title="No resources shared yet"
              description={
                activeFilter !== 'all'
                  ? `No resources found in the "${activeFilter}" category.`
                  : 'Organize GitHub repos, Google Drive docs, research papers, datasets, and private team files in one place.'
              }
              icon={<Ionicons name="folder-open-outline" size={38} color={colors.primary} />}
              actionTitle="Add Resource"
              onAction={() => openAddModal('external_link')}
            />
          </Card>
        ) : (
          <View style={styles.resourcesList}>
            {resources.map((res) => {
              const catOpt =
                RESOURCE_CATEGORY_OPTIONS.find((c) => c.category === res.category) ?? {
                  category: 'other' as const,
                  label: 'Custom',
                  icon: 'folder-outline',
                  badgeVariant: 'default' as const,
                };
              const categoryDisplay =
                res.category === 'other' && res.custom_category
                  ? res.custom_category
                  : catOpt.label;
              const isUpload = res.resource_type === 'file_upload';
              const canDelete = isOwnerOrAdmin || res.created_by === user?.id;

              return (
                <Card key={res.id} style={styles.resourceCard}>
                  <View style={styles.resourceTopRow}>
                    <View style={styles.badgeWrap}>
                      <Badge
                        label={categoryDisplay}
                        variant={catOpt.badgeVariant}
                        size="sm"
                      />
                      <Badge
                        label={isUpload ? 'Private File' : 'External Link'}
                        variant={isUpload ? 'primary' : 'default'}
                        size="sm"
                      />
                      {res.milestone ? (
                        <Badge
                          label={`Milestone: ${res.milestone.title}`}
                          variant="info"
                          size="sm"
                        />
                      ) : null}
                    </View>

                    {canDelete ? (
                      <Pressable
                        hitSlop={8}
                        style={styles.iconBtn}
                        onPress={() => handleDeleteResource(res)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${res.title}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.titleRow}>
                    <IconTile
                      name={isUpload ? 'document-lock-outline' : 'globe-outline'}
                      tone="primary"
                      size={38}
                    />
                    <View style={styles.titleTextCol}>
                      <Text style={styles.resourceTitle}>{res.title}</Text>
                      <Text style={styles.resourceSub} numberOfLines={1}>
                        {isUpload
                          ? `${res.file_name ?? 'file'} • ${formatFileSize(res.file_size_bytes)}`
                          : res.external_url}
                      </Text>
                    </View>
                  </View>

                  {res.description ? (
                    <Text style={styles.resourceDesc}>{res.description}</Text>
                  ) : null}

                  <View style={styles.resourceFooter}>
                    <Text style={styles.metaText}>
                      {res.author?.full_name ? `Added by ${res.author.full_name} • ` : ''}
                      {new Date(res.created_at).toLocaleDateString()}
                    </Text>

                    <Button
                      title={isUpload ? 'Download (Signed URL)' : 'Open Link'}
                      variant={isUpload ? 'soft' : 'outline'}
                      size="sm"
                      loading={openingResourceId === res.id}
                      leftIcon={
                        <Ionicons
                          name={isUpload ? 'download-outline' : 'open-outline'}
                          size={15}
                          color={colors.primary}
                        />
                      }
                      onPress={() => handleOpenResource(res)}
                      accessibilityLabel={
                        isUpload
                          ? `Download private file ${res.title}`
                          : `Open external link ${res.title}`
                      }
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add External Link / Upload Private File Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {resourceType === 'external_link'
                  ? 'Add External Resource Link'
                  : 'Upload Private Project File'}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => setIsModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close resource modal"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Mode Toggle */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Resource Type</Text>
                <View style={styles.chipWrap}>
                  <Pressable
                    style={[
                      styles.optionChip,
                      resourceType === 'external_link' && styles.optionChipSelected,
                    ]}
                    onPress={() => setResourceType('external_link')}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to External Link"
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        resourceType === 'external_link' && styles.optionChipTextSelected,
                      ]}
                    >
                      External Link (Drive / GitHub / Web)
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.optionChip,
                      resourceType === 'file_upload' && styles.optionChipSelected,
                    ]}
                    onPress={() => setResourceType('file_upload')}
                    accessibilityRole="button"
                    accessibilityLabel="Switch to Private File Upload"
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        resourceType === 'file_upload' && styles.optionChipTextSelected,
                      ]}
                    >
                      Private File Upload
                    </Text>
                  </Pressable>
                </View>
              </View>

              {formError ? <Text style={styles.modalErrorText}>{formError}</Text> : null}

              <Input
                label="Title *"
                placeholder={
                  resourceType === 'external_link'
                    ? 'e.g. GitHub Repository or Figma Wireframes'
                    : 'e.g. Lab Experiment Dataset or Design Notes'
                }
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              {resourceType === 'external_link' ? (
                <Input
                  label="External URL (https://) *"
                  placeholder="https://github.com/team/project"
                  value={externalUrl}
                  onChangeText={setExternalUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              ) : (
                <>
                  <View style={styles.nativeDocPickBox}>
                    <Button
                      testID="pick-document-button"
                      title={pickedFile ? 'Change Selected File' : 'Pick Document from Device'}
                      variant="soft"
                      size="md"
                      leftIcon={<Ionicons name="document-attach-outline" size={18} color={colors.primaryDark} />}
                      onPress={handlePickDocument}
                    />
                    {pickedFile ? (
                      <View style={styles.pickedFileNotice}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.brandMint} />
                        <Text style={styles.pickedFileNameText} numberOfLines={1}>
                          {pickedFile.name} ({formatFileSize(pickedFile.size)})
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Input
                    label="File Name *"
                    placeholder="notes.md"
                    value={fileName}
                    onChangeText={setFileName}
                    autoCapitalize="none"
                  />

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>File Format (Allowed MIME)</Text>
                    <View style={styles.chipWrap}>
                      {UPLOAD_MIME_PRESETS.map((preset) => {
                        const isSelected = mimeType === preset.mimeType;
                        return (
                          <Pressable
                            key={preset.mimeType}
                            style={[
                              styles.optionChip,
                              isSelected && styles.optionChipSelected,
                            ]}
                            onPress={() => {
                              setMimeType(preset.mimeType);
                              if (!fileName.endsWith(preset.ext)) {
                                const stem = fileName.split('.')[0] || 'artifact';
                                setFileName(`${stem}${preset.ext}`);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.optionChipText,
                                isSelected && styles.optionChipTextSelected,
                              ]}
                            >
                              {preset.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="File Content *"
                    placeholder="Paste or type document/dataset contents to store in private bucket..."
                    value={fileContent}
                    onChangeText={setFileContent}
                    multiline
                    numberOfLines={4}
                  />
                </>
              )}

              <Input
                label="Description (Optional)"
                placeholder="How should teammates use this resource?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />

              {/* Category Selector */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Category</Text>
                <View style={styles.chipWrap}>
                  {RESOURCE_CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = category === opt.category;
                    return (
                      <Pressable
                        key={opt.category}
                        style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                        onPress={() => setCategory(opt.category)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select category ${opt.label}`}
                      >
                        <Text
                          style={[
                            styles.optionChipText,
                            isSelected && styles.optionChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {category === 'other' ? (
                <Input
                  label="Custom Category Label"
                  placeholder="e.g. Hardware Datasheets"
                  value={customCategory}
                  onChangeText={setCustomCategory}
                />
              ) : null}

              {/* Optional Milestone Link */}
              {milestones.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Linked Milestone (Optional)</Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      style={[
                        styles.optionChip,
                        selectedMilestoneId === null && styles.optionChipSelected,
                      ]}
                      onPress={() => setSelectedMilestoneId(null)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedMilestoneId === null && styles.optionChipTextSelected,
                        ]}
                      >
                        None
                      </Text>
                    </Pressable>
                    {milestones.map((ms) => {
                      const isSelected = selectedMilestoneId === ms.id;
                      return (
                        <Pressable
                          key={ms.id}
                          style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                          onPress={() => setSelectedMilestoneId(ms.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              isSelected && styles.optionChipTextSelected,
                            ]}
                          >
                            {ms.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setIsModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title={
                  resourceType === 'external_link' ? 'Save Resource Link' : 'Upload File'
                }
                variant="primary"
                size="md"
                loading={isSaving}
                onPress={handleSaveResource}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    gap: spacing.base,
  },
  errorContainer: {
    padding: spacing.base,
  },
  summaryCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryTitleCol: {
    flex: 1,
    minWidth: 150,
  },
  headerActionBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  projectSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  screenTitle: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  securityCaption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  emptyCard: {
    paddingVertical: spacing.lg,
  },
  resourcesList: {
    gap: spacing.md,
  },
  resourceCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  resourceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  iconBtn: {
    padding: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleTextCol: {
    flex: 1,
  },
  resourceTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  resourceSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  resourceDesc: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  resourceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.base,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  modalErrorText: {
    ...typography.caption,
    color: colors.dangerText,
    marginBottom: spacing.sm,
  },
  nativeDocPickBox: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pickedFileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pickedFileNameText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: colors.primary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});

