import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { canChooseFromPhotoLibrary } from "@/features/shared/photoLibraryPermission";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage, resolveResourceUrl } from "@/api/client";
import { deleteClientPhoto, uploadClientPhoto } from "@/api/clientPhotos";
import { cacheClient, getCachedClient, getClient } from "@/api/clients";
import { getClientSavings } from "@/api/savings";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Client, ClientSavings } from "@/types";
import { formatCurrency, formatDate, formatLabel, joinMeta } from "@/utils/format";

function getClientPhotoUrl(client: Client) {
  // The profile image is rendered at avatar size, so prefer the much smaller
  // server thumbnail instead of downloading the original photo on every tap.
  return resolveResourceUrl(client.thumbnail_url || client.current_picture_url || client.picture_url || client.photo_url);
}

export function ClientDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const clientId = Number(params.id);
  const [client, setClient] = useState<Client | null>(() => Number.isFinite(clientId) ? getCachedClient(clientId) : null);
  const [savings, setSavings] = useState<ClientSavings | null>(null);
  const [loading, setLoading] = useState(!client);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [localPhotoUri, setLocalPhotoUri] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(clientId)) {
      setError("Client details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    const cached = getCachedClient(clientId);
    if (cached) setClient(cached);
    setLoading(!cached);

    // Refresh both resources independently. A slow or unavailable detail route
    // must not hide the client record already returned by the working list API.
    const [clientResult, savingsResult] = await Promise.allSettled([
      getClient(clientId),
      getClientSavings(clientId)
    ]);
    if (clientResult.status === "fulfilled") {
      setClient(clientResult.value);
      setPhotoFailed(false);
    } else if (!cached) {
      setError(getErrorMessage(clientResult.reason, "Unable to load client details."));
    }
    if (savingsResult.status === "fulfilled") setSavings(savingsResult.value);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function choosePhoto(source: "camera" | "library") {
    if (!client) return;
    setPhotoError("");
    setPhotoMessage("");
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
    if (result.canceled) return;

    setPhotoSaving(true);
    try {
      setClient(cacheClient(await uploadClientPhoto(client.id, result.assets[0])));
      setLocalPhotoUri(result.assets[0].uri);
      setPhotoFailed(false);
      setPhotoRevision(Date.now());
      setPhotoMessage("Client photo updated.");
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not update this client photo."));
    } finally {
      setPhotoSaving(false);
    }
  }

  function confirmDeletePhoto() {
    if (!client) return;
    Alert.alert("Delete photo", `Remove ${client.full_name}'s client photo?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => void removePhoto(), style: "destructive", text: "Delete" }
    ]);
  }

  async function removePhoto() {
    if (!client) return;
    setPhotoError("");
    setPhotoMessage("");
    setPhotoSaving(true);
    try {
      setClient(cacheClient(await deleteClientPhoto(client.id)));
      setLocalPhotoUri("");
      setPhotoFailed(false);
      setPhotoRevision(Date.now());
      setPhotoMessage("Client photo removed.");
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not delete this client photo."));
    } finally {
      setPhotoSaving(false);
    }
  }

  if (loading && !client) return <LoadingState />;

  const rawPhotoUrl = client ? getClientPhotoUrl(client) : "";
  const refreshedPhotoUrl = rawPhotoUrl && photoRevision ? `${rawPhotoUrl}${rawPhotoUrl.includes("?") ? "&" : "?"}v=${photoRevision}` : rawPhotoUrl;
  const photoUrl = localPhotoUri || refreshedPhotoUrl;
  const accounts = savings?.accounts ?? [];
  const transactions = savings?.transactions?.slice(0, 5) ?? [];
  const balance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), Number(client?.savings_balance || 0));

  return (
    <Screen>
      <View style={styles.pageHeading}><Text style={styles.pageEyebrow}>Client record</Text><Text style={styles.pageTitle}>Client details</Text></View>
      <ResourceError message={error || photoError} />
      {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
      {client ? (
        <>
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              {photoUrl && !photoFailed ? (
                <View style={styles.avatarFrame}>
                  <Image fadeDuration={180} onError={() => { setPhotoFailed(true); setPhotoLoading(false); }} onLoadEnd={() => setPhotoLoading(false)} onLoadStart={() => setPhotoLoading(true)} source={{ cache: "force-cache", uri: photoUrl }} style={styles.avatar} />
                  {photoLoading ? <View style={styles.avatarLoader}><ActivityIndicator color={colors.primaryDark} size="small" /></View> : null}
                </View>
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" color={colors.primaryDark} size={30} />
                </View>
              )}
              <View style={styles.profileCopy}>
                <Text style={styles.name}>{client.full_name}</Text>
                <Text style={styles.profileMeta}>{joinMeta([client.reg_number || client.prefixed_id, client.email || "No email", client.mobile_telephone])}</Text>
                <View style={styles.badges}>
                  <StatusBadge tone="info" text="Client" />
                  {client.active_loans_count ? <StatusBadge tone="warning" text={`${client.active_loans_count} loans`} /> : null}
                </View>
              </View>
            </View>
            <View style={styles.photoActions}>
              <Pressable accessibilityLabel="Take client photo" accessibilityRole="button" disabled={photoSaving} onPress={() => choosePhoto("camera")} style={styles.photoButton}>
                <Ionicons name="camera-outline" color={colors.primaryDark} size={17} />
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.photoButtonText}>Camera</Text>
              </Pressable>
              <Pressable accessibilityLabel="Choose client photo from gallery" accessibilityRole="button" disabled={photoSaving} onPress={() => choosePhoto("library")} style={styles.photoButton}>
                <Ionicons name="images-outline" color={colors.primaryDark} size={17} />
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.photoButtonText}>Gallery</Text>
              </Pressable>
              {photoUrl ? (
                <Pressable accessibilityLabel="Remove client photo" accessibilityRole="button" disabled={photoSaving} onPress={confirmDeletePhoto} style={styles.deletePhotoButton}>
                  {photoSaving ? <ActivityIndicator color={colors.danger} size="small" /> : <Ionicons name="trash-outline" color={colors.danger} size={17} />}
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.deletePhotoButtonText}>{photoSaving ? "Removing..." : "Remove photo"}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <FeatureCard
            accent="#16a34a"
            icon="wallet"
            subtitle="Savings and loan indicators from authorized client records."
            title="Financial summary"
            value={formatCurrency(balance)}
            meta={joinMeta([`Loans ${client.active_loans_count || 0}`, accounts.length ? `${accounts.length} savings accounts` : null])}
          />

          <SectionHeader title="Savings accounts" subtitle="Account balances visible to your staff permissions." />
          {accounts.length ? accounts.map((account) => (
            <View key={account.id} style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.cardTitle}>{account.account_number || "Savings account"}</Text>
                <StatusBadge tone={account.status === "active" ? "success" : "neutral"} text={account.status || "account"} />
              </View>
              <AmountRow label="Balance" value={formatCurrency(account.balance)} tone="success" />
              {account.opening_date ? <Text style={styles.muted}>Opened {formatDate(account.opening_date)}</Text> : null}
            </View>
          )) : <EmptyState text="No savings accounts are available for this client." />}

          <SectionHeader title="Recent transactions" subtitle="Showing the latest available entries." />
          {transactions.length ? transactions.map((transaction) => (
            <View key={transaction.id} style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.cardTitle}>{formatLabel(transaction.transaction_type)}</Text>
                <StatusBadge tone={transaction.status === "completed" ? "success" : "info"} text={transaction.status || "posted"} />
              </View>
              <AmountRow label={formatDate(transaction.transaction_date)} value={formatCurrency(transaction.amount)} tone={transaction.transaction_type === "withdrawal" ? "danger" : "success"} />
              <Text style={styles.muted}>{transaction.payment_method || "Method not recorded"}</Text>
            </View>
          )) : <EmptyState text="No recent transactions are available for this client." />}
        </>
      ) : (
        <EmptyState text="Client details are unavailable." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 42, height: 84, width: 84 },
  avatarFallback: { alignItems: "center", backgroundColor: "white", borderColor: "rgba(255,255,255,0.45)", borderRadius: 42, borderWidth: 3, height: 84, justifyContent: "center", width: 84 },
  avatarFrame: { backgroundColor: "white", borderColor: "rgba(255,255,255,0.45)", borderRadius: 42, borderWidth: 3, height: 84, overflow: "hidden", width: 84 },
  avatarLoader: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.88)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "900" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: "white", fontSize: 22, fontWeight: "900" },
  pageEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  pageHeading: { marginBottom: spacing.md, marginTop: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  profileMeta: { color: "rgba(255,255,255,0.76)", lineHeight: 19, marginTop: spacing.xs },
  deletePhotoButton: { alignItems: "center", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, flexBasis: "30%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: "center", minHeight: 40, minWidth: 0, paddingHorizontal: spacing.xs },
  deletePhotoButtonText: { color: colors.danger, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  photoActions: { alignSelf: "stretch", flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  photoButton: { alignItems: "center", backgroundColor: "white", borderRadius: radius.md, flexBasis: "30%", flexDirection: "row", flexGrow: 1, flexShrink: 1, gap: 4, justifyContent: "center", minHeight: 40, minWidth: 0, paddingHorizontal: spacing.xs },
  photoButtonText: { color: colors.primaryDark, flexShrink: 1, fontSize: 11, fontWeight: "900" },
  profileCard: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, marginBottom: spacing.lg, padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14 },
  profileCopy: { flex: 1 },
  profileTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md }
});
