export { ChildPhotosScreen as ChildrenScreen } from "./ChildPhotosScreen";
/*
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { uploadChildPhoto } from "@/api/children";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Child } from "@/types";
import { joinMeta } from "@/utils/format";
import { useChildren } from "./useChildren";

export function ChildrenScreen() {
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useChildren();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");

  if (loading && !items.length) return <LoadingState />;

  async function chooseFromCamera(child: Child) {
    setPhotoError("");
    setPhotoMessage("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Camera permission is required to take a child photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.82
    });
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
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.82
    });
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
        <Text style={styles.title}>Children</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="camera" color="white" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Photo updates for child profiles</Text>
            <Text style={styles.summaryText}>Take a fresh picture in the field or upload one from the phone gallery.</Text>
          </View>
        </View>

        <SearchBox value={search} onChangeText={setSearch} placeholder="Search children" />
        <ResourceError message={error || photoError} />
        {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
        {!error && count ? <Text style={styles.resultCount}>{count} child record{count === 1 ? "" : "s"} found</Text> : null}

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
                  {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryButtonText}>Upload photo</Text>}
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
      <View style={styles.childCard}>
        {item.current_picture_url ? (
          <Image source={{ uri: item.current_picture_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" color={colors.primaryDark} size={24} />
          </View>
        )}
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.full_name}</Text>
          <Text style={styles.childMeta}>{joinMeta([item.prefixed_id, item.preferred_name ? `Prefers ${item.preferred_name}` : "", item.district || item.residence || "No location"])}</Text>
          <Text style={styles.childStatus}>{item.is_sponsored ? "Sponsored" : "Needs sponsor"}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => chooseFromCamera(item)} style={styles.actionButton}>
              <Ionicons name="camera-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.actionText}>Camera</Text>
            </Pressable>
            <Pressable onPress={() => chooseFromLibrary(item)} style={styles.actionButton}>
              <Ionicons name="images-outline" color={colors.primaryDark} size={18} />
              <Text style={styles.actionText}>Gallery</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function renderFooter() {
    if (loadingMore) {
      return (
        <View style={styles.footerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.footerText}>Loading more children...</Text>
        </View>
      );
    }
    if (loadMoreError) {
      return (
        <View style={styles.loadMoreError}>
          <Text style={styles.loadMoreErrorText}>{loadMoreError}</Text>
          <Pressable onPress={loadMore} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    if (items.length && !hasMore) return <Text style={styles.endText}>All matching children are loaded.</Text>;
    return null;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderChild}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loading && !error ? <EmptyState text={search ? "No children match your search." : "No child records found."} /> : null}
      ListFooterComponent={renderFooter}
      contentContainerStyle={styles.content}
      onEndReached={loadMore}
      onEndReachedThreshold={0.35}
      refreshing={refreshing}
      onRefresh={refresh}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 36 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  summary: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: "white", fontSize: 17, fontWeight: "900" },
  summaryText: { color: "#ccfbf1", lineHeight: 20, marginTop: spacing.xs },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  resultCount: { color: colors.muted, fontSize: 12, fontWeight: "800", marginBottom: spacing.md, textTransform: "uppercase" },
  previewCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.md },
  previewImage: { borderRadius: radius.md, height: 104, width: 104 },
  previewCopy: { flex: 1 },
  previewTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  previewText: { color: colors.muted, marginTop: spacing.xs },
  previewActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1, justifyContent: "center", padding: spacing.md },
  primaryButtonText: { color: "white", fontWeight: "800" },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", padding: spacing.md },
  secondaryButtonText: { color: colors.text, fontWeight: "800" },
  childCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  avatar: { borderRadius: 34, height: 68, width: 68 },
  avatarFallback: { alignItems: "center", backgroundColor: "#ccfbf1", borderRadius: 34, height: 68, justifyContent: "center", width: 68 },
  childInfo: { flex: 1 },
  childName: { color: colors.text, fontSize: 17, fontWeight: "900" },
  childMeta: { color: colors.muted, marginTop: spacing.xs },
  childStatus: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  actionButton: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionText: { color: colors.primaryDark, fontWeight: "800" },
  footerState: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  footerText: { color: colors.muted, fontWeight: "700" },
  loadMoreError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, gap: spacing.md, marginTop: spacing.sm, padding: spacing.md },
  loadMoreErrorText: { color: colors.danger, fontWeight: "700", lineHeight: 20 },
  retryButton: { alignSelf: "flex-start", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryText: { color: colors.danger, fontWeight: "900" },
  endText: { color: colors.muted, fontSize: 12, fontWeight: "800", padding: spacing.lg, textAlign: "center", textTransform: "uppercase" }
});
*/
