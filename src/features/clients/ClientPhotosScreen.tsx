import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { EmptyState, LoadingState } from "@/components/Screen";
import { SearchBox } from "@/components/SearchBox";
import { colors, radius, spacing } from "@/constants/theme";
import { PaginatedListFooter, ResourceError } from "@/features/shared/ResourceStates";
import { canChooseFromPhotoLibrary } from "@/features/shared/photoLibraryPermission";
import type { Client } from "@/types";
import { getErrorMessage, resolveResourceUrl } from "@/api/client";
import { uploadClientPhoto } from "@/api/clientPhotos";
import { joinMeta } from "@/utils/format";
import { useClients } from "./useClients";
import { useAuth } from "@/providers/AuthProvider";
import { isClientAccount } from "@/utils/roles";

function getClientPhotoUrl(client: Client) {
  return resolveResourceUrl(client.thumbnail_url || client.current_picture_url || client.picture_url || client.photo_url);
}

function getClientFullPhotoUrl(client: Client) {
  return resolveResourceUrl(client.current_picture_url || client.picture_url || client.photo_url || client.thumbnail_url);
}

function ClientPhotoTile({ canEdit, client, onCamera, onLibrary, onOpen, overrideUrl }: { canEdit: boolean; client: Client; onCamera: (client: Client) => void; onLibrary: (client: Client) => void; onOpen: (client: Client, overrideUrl?: string) => void; overrideUrl?: string }) {
  const thumbnailUrl = getClientPhotoUrl(client);
  const fullPhotoUrl = getClientFullPhotoUrl(client);
  const [imageUrl, setImageUrl] = useState(thumbnailUrl);
  const [imageFailed, setImageFailed] = useState(false);

  function handleImageError() {
    if (imageUrl !== fullPhotoUrl && fullPhotoUrl) {
      setImageUrl(fullPhotoUrl);
      return;
    }
    setImageFailed(true);
  }

  const displayedImageUrl = overrideUrl || (!imageFailed ? imageUrl : "");
  const canOpen = Boolean(overrideUrl || fullPhotoUrl) && Boolean(overrideUrl || !imageFailed);
  return (
    <View style={styles.tile}>
      <Pressable disabled={!canOpen} onPress={() => onOpen(client, overrideUrl)} style={styles.photoButton}>
        {displayedImageUrl ? (
          <Image onError={overrideUrl ? undefined : handleImageError} source={{ uri: displayedImageUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoFallback}>
            <Ionicons name="person" color={colors.primaryDark} size={24} />
          </View>
        )}
      </Pressable>
      <Text numberOfLines={1} style={styles.clientName}>{client.full_name}</Text>
      <Text numberOfLines={1} style={styles.clientMeta}>{joinMeta([client.reg_number || client.prefixed_id, client.email || "No email"])}</Text>
      {canEdit ? <View style={styles.photoActions}>
        <Pressable accessibilityLabel={`Take photo for ${client.full_name}`} accessibilityRole="button" onPress={() => onCamera(client)} style={styles.iconAction}>
          <Ionicons color={colors.primaryDark} name="camera-outline" size={18} />
        </Pressable>
        <Pressable accessibilityLabel={`Choose photo for ${client.full_name}`} accessibilityRole="button" onPress={() => onLibrary(client)} style={styles.iconAction}>
          <Ionicons color={colors.primaryDark} name="images-outline" size={18} />
        </Pressable>
      </View> : <View style={styles.viewOnly}><Ionicons color={colors.muted} name="eye-outline" size={14} /><Text style={styles.viewOnlyText}>View only</Text></View>}
    </View>
  );
}

export function ClientPhotosScreen() {
  const { user } = useAuth();
  const ownPhotoMode = isClientAccount(user);
  const linkedClientId = user?.client_id;
  const { count, error, hasMore, items, loadMore, loadMoreError, loading, loadingMore, refresh, refreshing, search, setSearch } = useClients();
  const [viewer, setViewer] = useState<Client | null>(null);
  const [viewerLocalUrl, setViewerLocalUrl] = useState("");
  const [viewerImageFailed, setViewerImageFailed] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoOverrides, setPhotoOverrides] = useState<Record<number, string>>({});
  if (loading && !items.length) return <LoadingState />;

  const visibleItems = ownPhotoMode ? items.filter((client) => client.id === linkedClientId) : items;
  const photos = visibleItems.filter(getClientPhotoUrl);

  async function choosePhoto(client: Client, source: "camera" | "library") {
    setPhotoError("");
    setPhotoMessage("");
    if (ownPhotoMode && client.id !== linkedClientId) {
      setPhotoError("You can only update your own profile photo.");
      return;
    }
    const permissionGranted = source === "camera"
      ? (await ImagePicker.requestCameraPermissionsAsync()).granted
      : await canChooseFromPhotoLibrary();
    if (!permissionGranted) {
      setPhotoError(source === "camera" ? "Camera permission is required to take a client photo." : "Photo library permission is required to choose a client photo.");
      return;
    }
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (!result.canceled) {
      setSelectedClient(client);
      setSelectedAsset(result.assets[0]);
    }
  }

  async function uploadSelectedPhoto() {
    if (!selectedClient || !selectedAsset) return;
    if (ownPhotoMode && selectedClient.id !== linkedClientId) {
      setPhotoError("You can only update your own profile photo.");
      setSelectedClient(null);
      setSelectedAsset(null);
      return;
    }
    setUploading(true);
    setPhotoError("");
    setPhotoMessage("");
    try {
      await uploadClientPhoto(selectedClient.id, selectedAsset);
      setPhotoOverrides((current) => ({ ...current, [selectedClient.id]: selectedAsset.uri }));
      setPhotoMessage(`Updated ${selectedClient.full_name}'s profile photo.`);
      setSelectedAsset(null);
      setSelectedClient(null);
      void refresh();
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not upload this client photo."));
    } finally {
      setUploading(false);
    }
  }

  function renderHeader() {
    return (
      <>
        <Text style={styles.title}>{ownPhotoMode ? "My Profile Photo" : "Client Photos"}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name={ownPhotoMode ? "shield-checkmark" : "people"} color="white" size={24} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{ownPhotoMode ? "Your verified profile photo" : "Authorized client gallery"}</Text>
            <Text style={styles.summaryText}>{ownPhotoMode ? "For your security, only authorized staff can capture or change this photo." : `Total accessible clients: ${count || items.length}.`}</Text>
          </View>
        </View>
        {!ownPhotoMode ? <SearchBox value={search} onChangeText={setSearch} placeholder="Search clients" /> : null}
        <ResourceError message={error || photoError} />
        {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
        {selectedClient && selectedAsset ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Ready to upload</Text>
              <Text numberOfLines={1} style={styles.previewText}>{selectedClient.full_name}</Text>
              <View style={styles.previewActions}>
                <Pressable disabled={uploading} onPress={() => { setSelectedAsset(null); setSelectedClient(null); }} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable disabled={uploading} onPress={uploadSelectedPhoto} style={styles.primaryButton}>
                  {uploading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.primaryButtonText}>Upload photo</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </>
    );
  }  

  function renderClient({ item }: { item: Client }) {
    return <ClientPhotoTile canEdit={!ownPhotoMode} client={item} onCamera={(client) => void choosePhoto(client, "camera")} onLibrary={(client) => void choosePhoto(client, "library")} onOpen={(client, localUrl) => { setViewerImageFailed(false); setViewerLocalUrl(localUrl || ""); setViewer(client); }} overrideUrl={photoOverrides[item.id]} />;
  }

  return (
    <>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        renderItem={renderClient}
        ListHeaderComponent={renderHeader()}
        ListEmptyComponent={!loading && !error ? <EmptyState text={ownPhotoMode ? "No client profile is linked to this account." : search ? "No clients match your search." : "No client photos available."} /> : null}
        ListFooterComponent={!ownPhotoMode ? <PaginatedListFooter endText={photos.length ? "All matching client records are loaded." : "No client photo URLs are exposed by the current API."} error={loadMoreError} loading={loadingMore} loadingText="Loading more clients..." onRetry={loadMore} showEnd={items.length > 0 && !hasMore} /> : null}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.content}
        onEndReached={ownPhotoMode ? undefined : loadMore}
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
          {viewer && !viewerImageFailed ? (
            <Image onError={() => setViewerImageFailed(true)} resizeMode="contain" source={{ uri: viewerLocalUrl || getClientFullPhotoUrl(viewer) }} style={styles.viewerImage} />
          ) : viewer ? (
            <View style={styles.viewerFallback}>
              <Ionicons name="image-outline" color="white" size={42} />
              <Text style={styles.viewerFallbackText}>This photo is no longer available.</Text>
            </View>
          ) : null}
          <Text style={styles.viewerTitle}>{viewer?.full_name}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  clientMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  clientName: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: spacing.sm },
  closeButton: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.72)", borderRadius: 22, height: 44, justifyContent: "center", position: "absolute", right: spacing.lg, top: spacing.xl, width: 44, zIndex: 2 },
  columns: { gap: spacing.md },
  content: { padding: spacing.lg, paddingBottom: 36 },
  photo: { aspectRatio: 1, borderRadius: radius.md, width: "100%" },
  photoActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  photoButton: { aspectRatio: 1, width: "100%" },
  photoFallback: { alignItems: "center", aspectRatio: 1, backgroundColor: colors.primarySoft, borderRadius: radius.md, justifyContent: "center", width: "100%" },
  iconAction: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 38 },
  previewActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  previewCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.md },
  previewCopy: { flex: 1, minWidth: 0 },
  previewImage: { borderRadius: radius.md, height: 96, width: 96 },
  previewText: { color: colors.muted, marginTop: spacing.xs },
  previewTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  primaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1.2, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.sm },
  primaryButtonText: { color: "white", fontSize: 12, fontWeight: "900" },
  root: { backgroundColor: colors.background, flex: 1 },
  summary: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  summaryCopy: { flex: 1 },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  summaryText: { color: "#ccfbf1", lineHeight: 20, marginTop: spacing.xs },
  summaryTitle: { color: "white", fontSize: 17, fontWeight: "900" },
  secondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 42 },
  secondaryButtonText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  tile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, marginBottom: spacing.md, padding: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  viewer: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.94)", flex: 1, justifyContent: "center", padding: spacing.lg },
  viewerFallback: { alignItems: "center", justifyContent: "center", minHeight: 220 },
  viewerFallbackText: { color: "white", marginTop: spacing.md, textAlign: "center" },
  viewerImage: { height: "76%", width: "100%" },
  viewerTitle: { color: "white", fontSize: 18, fontWeight: "900", marginTop: spacing.lg, textAlign: "center" },
  viewOnly: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, justifyContent: "center", marginTop: spacing.sm, minHeight: 38 },
  viewOnlyText: { color: colors.muted, fontSize: 11, fontWeight: "800" }
});
