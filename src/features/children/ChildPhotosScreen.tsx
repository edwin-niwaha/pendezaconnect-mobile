import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
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

export function ChildPhotosScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const scope = typeof params.scope === "string" ? params.scope : "";
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useChildren(scope);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [viewer, setViewer] = useState<Child | null>(null);
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
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
        <Text style={styles.title}>{scopeTitle(scope)}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="camera" color="white" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Photo gallery</Text>
            <Text style={styles.summaryText}>Showing {count || items.length} authorized child records with progressive loading.</Text>
          </View>
        </View>
        <SearchBox value={search} onChangeText={setSearch} placeholder="Search children" />
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
        <Pressable onPress={() => router.push(`/(tabs)/children/${item.id}`)} style={styles.photoButton}>
          {item.current_picture_url ? (
            <Image source={{ uri: item.current_picture_url }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Ionicons name="person" color={colors.primaryDark} size={24} />
            </View>
          )}
        </Pressable>
        <Text numberOfLines={1} style={styles.childName}>{item.full_name}</Text>
        <Text numberOfLines={1} style={styles.childMeta}>{joinMeta([item.prefixed_id, item.is_sponsored ? "Sponsored" : "Needs sponsor"])}</Text>
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
    <>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={renderChild}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No children match your search." : "No child photos available."} /> : null}
        ListFooterComponent={<PaginatedListFooter endText="All matching children are loaded." error={loadMoreError} loading={loadingMore} loadingText="Loading more photos..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} />}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshing={refreshing}
        onRefresh={refresh}
        style={styles.root}
      />
      <Modal animationType="fade" visible={Boolean(viewer)} transparent onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo viewer" onPress={() => setViewer(null)} style={styles.closeButton}>
            <Ionicons name="close" color="white" size={24} />
          </Pressable>
          {viewer?.current_picture_url ? <Image resizeMode="contain" source={{ uri: viewer.current_picture_url }} style={styles.viewerImage} /> : null}
          <Text style={styles.viewerTitle}>{viewer?.full_name}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  childMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  childName: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  closeButton: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.72)", borderRadius: 22, height: 44, justifyContent: "center", position: "absolute", right: spacing.lg, top: spacing.xl, width: 44, zIndex: 2 },
  columns: { gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
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
  summary: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  summaryCopy: { flex: 1 },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  summaryText: { color: "#ccfbf1", lineHeight: 20, marginTop: spacing.xs },
  summaryTitle: { color: "white", fontSize: 17, fontWeight: "900" },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, marginBottom: spacing.md, padding: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  viewer: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.94)", flex: 1, justifyContent: "center", padding: spacing.lg },
  viewerImage: { height: "76%", width: "100%" },
  viewerTitle: { color: "white", fontSize: 18, fontWeight: "900", marginTop: spacing.lg, textAlign: "center" }
});
