import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { canChooseFromPhotoLibrary } from "@/features/shared/photoLibraryPermission";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getErrorMessage, resolveResourceUrl } from "@/api/client";
import { uploadChildPhoto } from "@/api/children";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import type { Child } from "@/types";
import { joinMeta } from "@/utils/format";
import { router, useLocalSearchParams } from "expo-router";
import { useChildren } from "./useChildren";

function matchesScope(child: Child, scope: string) {
  if (scope === "sponsored") return child.is_sponsored === true;
  if (scope === "non-sponsored") return child.is_sponsored === false;
  if (scope === "departed") return child.is_departed === true;
  return true;
}

function scopeTitle(scope: string) {
  if (scope === "sponsored") return "Sponsored Children";
  if (scope === "non-sponsored") return "Non-sponsored Children";
  if (scope === "departed") return "Departed Children";
  return "Child Photos";
}

const childScopes = [
  { label: "All active", value: "" },
  { label: "Sponsored", value: "sponsored" },
  { label: "Needs sponsor", value: "non-sponsored" },
  { label: "Departed", value: "departed" }
] as const;

export function ChildPhotosScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const initialScope = typeof params.scope === "string" ? params.scope : "";
  const [scope, setScope] = useState(initialScope);
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useChildren(scope);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  const visibleItems = items.filter((item) => matchesScope(item, scope));

  if (loading && !items.length) return <LoadingState />;

  async function chooseFromCamera(child: Child) {
    setPhotoError("");
    setPhotoMessage("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Camera permission is required to take a child photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) {
      setSelectedChild(child);
      setSelectedAsset(result.assets[0]);
    }
  }

  async function chooseFromLibrary(child: Child) {
    setPhotoError("");
    setPhotoMessage("");
    if (!await canChooseFromPhotoLibrary()) {
      setPhotoError("Photo library permission is required to select a child photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) {
      setSelectedChild(child);
      setSelectedAsset(result.assets[0]);
    }
  }

  async function uploadSelectedPhoto() {
    if (!selectedChild || !selectedAsset) return;
    setUploading(true);
    setPhotoError("");
    setPhotoMessage("");
    try {
      await uploadChildPhoto(selectedChild.id, selectedAsset);
      setPhotoMessage(`Updated ${selectedChild.full_name}'s profile photo.`);
      setSelectedAsset(null);
      setSelectedChild(null);
      await refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not upload this photo."));
    } finally {
      setUploading(false);
    }
  }

  function renderHeader() {
    return (
      <>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}><Text style={styles.title}>Child photos</Text><Text style={styles.headingSubtitle}>Manage current profile pictures</Text></View>
          <View style={styles.countBadge}><Text style={styles.countValue}>{count}</Text><Text style={styles.countLabel}>children</Text></View>
        </View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search children" />
        <View style={styles.filterHeading}><Text style={styles.filterLabel}>Child view</Text><Text style={styles.filterCount}>{scopeTitle(scope)}</Text></View>
        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {childScopes.map((item) => {
            const active = scope === item.value;
            return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.value || "all"} onPress={() => setScope(item.value)} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>;
          })}
        </ScrollView>
        <ResourceError message={error || photoError} />
        {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
        {selectedChild && selectedAsset ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Ready to upload</Text>
              <Text style={styles.previewText}>{selectedChild.full_name}</Text>
              <View style={styles.previewActions}>
                <Pressable disabled={uploading} onPress={() => setSelectedAsset(null)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable disabled={uploading} onPress={uploadSelectedPhoto} style={styles.primaryButton}>
                  {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Upload</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  function renderChild({ item }: { item: Child }) {
    return (
      <Pressable onPress={() => router.push(`/(tabs)/children/${item.id}`)} style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        <View style={styles.photoButton}>
          {item.current_picture_url ? (
            <Image source={{ uri: resolveResourceUrl(item.current_picture_url) }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="person" color={colors.primaryDark} size={24} />
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={styles.childName}>{item.full_name}</Text>
        <Text numberOfLines={1} style={styles.childMeta}>{joinMeta([item.prefixed_id, item.is_departed ? "Departed" : item.is_sponsored ? "Sponsored" : "Needs sponsor"])}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityLabel={`Take photo for ${item.full_name}`} onPress={() => chooseFromCamera(item)} style={styles.iconAction}>
            <Ionicons name="camera-outline" color={colors.primaryDark} size={18} />
          </Pressable>
          <Pressable accessibilityLabel={`Choose photo for ${item.full_name}`} onPress={() => chooseFromLibrary(item)} style={styles.iconAction}>
            <Ionicons name="images-outline" color={colors.primaryDark} size={18} />
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={renderChild}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No children match your search." : "No child photos available."} /> : null}
        ListFooterComponent={<PaginatedListFooter endText="All matching children are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more photos..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.content}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshing={refreshing}
        removeClippedSubviews
        onRefresh={refresh}
        style={styles.root}
        windowSize={7}
      />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  childMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  childName: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  columns: { gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  countBadge: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, minWidth: 62, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  countLabel: { color: colors.primaryDark, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  countValue: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" },
  filterChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.md },
  filterChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterCount: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  filterHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  filterLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  filterRow: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: "white" },
  headingCopy: { flex: 1 },
  headingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between", marginBottom: spacing.lg },
  headingSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  iconAction: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 36 },
  photo: { aspectRatio: 1, borderRadius: radius.md, width: "100%" },
  photoButton: { aspectRatio: 1, width: "100%" },
  photoFallback: { alignItems: "center", aspectRatio: 1, backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", width: "100%" },
  previewActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  previewCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.md },
  previewCopy: { flex: 1 },
  previewImage: { borderRadius: radius.md, height: 96, width: 96 },
  previewText: { color: colors.muted, marginTop: spacing.xs },
  previewTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 42 },
  primaryButtonText: { color: "white", fontWeight: "800" },
  pressed: { opacity: 0.78 },
  root: { backgroundColor: colors.background, flex: 1 },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 42 },
  secondaryButtonText: { color: colors.text, fontWeight: "800" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, marginBottom: spacing.md, padding: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" }
});
