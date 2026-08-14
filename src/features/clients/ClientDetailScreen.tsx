import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage } from "@/api/client";
import { deleteClientPhoto, uploadClientPhoto } from "@/api/clientPhotos";
import { getClient } from "@/api/clients";
import { getClientSavings } from "@/api/savings";
import { AmountRow, FeatureCard, SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Client, ClientSavings } from "@/types";
import { formatCurrency, formatDate, formatLabel, joinMeta } from "@/utils/format";

function getClientPhotoUrl(client: Client) {
  return client.current_picture_url || client.picture_url || client.photo_url || client.thumbnail_url || "";
}

export function ClientDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const clientId = Number(params.id);
  const [client, setClient] = useState<Client | null>(null);
  const [savings, setSavings] = useState<ClientSavings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(clientId)) {
      setError("Client details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nextClient = await getClient(clientId);
      setClient(nextClient);
      try {
        setSavings(await getClientSavings(clientId));
      } catch {
        setSavings(null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load client details."));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function choosePhoto(source: "camera" | "library") {
    if (!client) return;
    setPhotoError("");
    setPhotoMessage("");
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(source === "camera" ? "Camera permission is required to take a client photo." : "Photo library permission is required to choose a client photo.");
      return;
    }
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"], quality: 0.82 });
    if (result.canceled) return;

    setPhotoSaving(true);
    try {
      setClient(await uploadClientPhoto(client.id, result.assets[0]));
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
      setClient(await deleteClientPhoto(client.id));
      setPhotoMessage("Client photo removed.");
    } catch (err) {
      setPhotoError(getErrorMessage(err, "Could not delete this client photo."));
    } finally {
      setPhotoSaving(false);
    }
  }

  if (loading && !client) return <LoadingState />;

  const photoUrl = client ? getClientPhotoUrl(client) : "";
  const accounts = savings?.accounts ?? [];
  const transactions = savings?.transactions?.slice(0, 5) ?? [];
  const balance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), Number(client?.savings_balance || 0));

  return (
    <Screen title="Client Details">
      <ResourceError message={error || photoError} />
      {photoMessage ? <Text style={styles.success}>{photoMessage}</Text> : null}
      {client ? (
        <>
          <View style={styles.profileCard}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" color={colors.primaryDark} size={30} />
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{client.full_name}</Text>
              <Text style={styles.muted}>{joinMeta([client.reg_number || client.prefixed_id, client.email || "No email", client.mobile_telephone])}</Text>
              <View style={styles.badges}>
                <StatusBadge tone="info" text="Client" />
                {client.active_loans_count ? <StatusBadge tone="warning" text={`${client.active_loans_count} loans`} /> : null}
              </View>
              <View style={styles.photoActions}>
                <Pressable disabled={photoSaving} onPress={() => choosePhoto("camera")} style={styles.photoButton}>
                  <Ionicons name="camera-outline" color={colors.primaryDark} size={18} />
                  <Text style={styles.photoButtonText}>Camera</Text>
                </Pressable>
                <Pressable disabled={photoSaving} onPress={() => choosePhoto("library")} style={styles.photoButton}>
                  <Ionicons name="images-outline" color={colors.primaryDark} size={18} />
                  <Text style={styles.photoButtonText}>Gallery</Text>
                </Pressable>
                {photoUrl ? (
                  <Pressable disabled={photoSaving} onPress={confirmDeletePhoto} style={styles.deletePhotoButton}>
                    {photoSaving ? <ActivityIndicator color={colors.danger} size="small" /> : <Ionicons name="trash-outline" color={colors.danger} size={18} />}
                  </Pressable>
                ) : null}
              </View>
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
  avatar: { borderRadius: 36, height: 72, width: 72 },
  avatarFallback: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 36, height: 72, justifyContent: "center", width: 72 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, padding: spacing.lg },
  cardTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "900" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  deletePhotoButton: { alignItems: "center", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 38, width: 42 },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  photoButton: { alignItems: "center", backgroundColor: "#ecfeff", borderRadius: radius.md, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  photoButtonText: { color: colors.primaryDark, fontWeight: "800" },
  profileCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  profileCopy: { flex: 1 },
  rowTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  success: { backgroundColor: "#dcfce7", borderRadius: radius.md, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md }
});
