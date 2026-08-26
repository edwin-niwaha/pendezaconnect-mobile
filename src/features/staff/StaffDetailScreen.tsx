import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getErrorMessage, resolveResourceUrl } from "@/api/client";
import { getStaff } from "@/api/staff";
import { SectionHeader, StatusBadge } from "@/components/Polished";
import { EmptyState, LoadingState, Screen } from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { ResourceError } from "@/features/shared/ResourceStates";
import type { Staff } from "@/types";
import { formatDate } from "@/utils/format";

function serviceDuration(startValue?: string | null, endValue?: string | null) {
  if (!startValue) return "Not recorded";
  const parseDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return year && month && day ? { day, month, year } : null;
  };
  const start = parseDate(startValue);
  const today = new Date();
  const end = endValue ? parseDate(endValue) : { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() };
  if (!start || !end) return "Not recorded";
  let months = (end.year - start.year) * 12 + end.month - start.month;
  if (end.day < start.day) months -= 1;
  if (months < 0) return "Not started";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!years && !remainingMonths) return "Less than 1 month";
  return [years ? `${years} ${years === 1 ? "year" : "years"}` : "", remainingMonths ? `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}` : ""].filter(Boolean).join(" ");
}

async function openContactUrl(url: string, unavailableMessage: string) {
  try {
    if (!await Linking.canOpenURL(url)) throw new Error("Unavailable");
    await Linking.openURL(url);
  } catch {
    Alert.alert("Action unavailable", unavailableMessage);
  }
}

function getStaffPhotoUrl(staff: Staff) {
  return resolveResourceUrl(staff.current_picture_url || staff.picture_url || staff.photo_url || staff.thumbnail_url);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S";
}

export function StaffDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const staffId = Number(params.id);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(staffId)) {
      setError("Staff details are unavailable.");
      setLoading(false);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const nextStaff = await getStaff(staffId);
      setStaff(nextStaff);
      setPhotoFailed(false);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load staff details."));
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !staff) return <LoadingState />;

  const photoUrl = staff ? getStaffPhotoUrl(staff) : "";

  return (
    <Screen>
      <View style={styles.pageHeading}><Text style={styles.pageEyebrow}>Staff record</Text><Text style={styles.pageTitle}>Staff details</Text></View>
      <ResourceError message={error} />
      {staff ? (
        <>
          <View style={styles.profileCard}>
            {photoUrl && !photoFailed ? (
              <View style={styles.avatarFrame}>
                <Image fadeDuration={180} onError={() => { setPhotoFailed(true); setPhotoLoading(false); }} onLoadEnd={() => setPhotoLoading(false)} onLoadStart={() => setPhotoLoading(true)} resizeMode="cover" source={{ uri: photoUrl }} style={styles.avatar} />
                {photoLoading ? <View style={styles.avatarLoader}><ActivityIndicator color={colors.primaryDark} size="small" /></View> : null}
              </View>
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials(staff.full_name)}</Text>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.name}>{staff.full_name}</Text>
              <Text numberOfLines={1} style={styles.profileRole}>{staff.job_title || "Staff member"}</Text>
              <Text style={styles.profileMeta}>{[staff.prefixed_id, staff.department].filter(Boolean).join(" · ") || "Staff record"}</Text>
              <View style={styles.badges}>
                <StatusBadge tone={staff.is_departed ? "danger" : "success"} text={staff.is_departed ? "Departed" : "Active"} />
                {staff.is_sponsored !== undefined ? <StatusBadge tone={staff.is_sponsored ? "info" : "neutral"} text={staff.is_sponsored ? "Sponsored" : "Not sponsored"} /> : null}
              </View>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/(tabs)/staff-photos", params: { scope: staff.is_departed ? "departed" : "" } })} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><View style={styles.photoActionIcon}><Ionicons name="camera-outline" color={colors.primaryDark} size={19} /></View><View style={styles.photoActionCopy}><Text style={styles.photoActionTitle}>{photoUrl && !photoFailed ? "Update profile photo" : "Add profile photo"}</Text><Text style={styles.photoActionText}>Open staff photo management</Text></View><Ionicons name="arrow-forward" color={colors.primaryDark} size={18} /></Pressable>

          <SectionHeader title="Staff information" />
          <View style={styles.infoGrid}>
            <InfoTile icon="briefcase-outline" label="Position" value={staff.job_title || "Staff member"} />
            <InfoTile icon="id-card-outline" label="Staff ID" value={staff.prefixed_id || "Not recorded"} />
            <InfoTile icon="business-outline" label="Department" value={staff.department || "Not recorded"} />
            <InfoTile icon="calendar-outline" label="Date of birth" value={formatDate(staff.date_of_birth)} />
            <InfoTile icon="calendar-number-outline" label="Started work" value={formatDate(staff.date_started_work)} />
            <InfoTile icon="time-outline" label="Time served" value={serviceDuration(staff.date_started_work, staff.departure_date)} />
          </View>

          <SectionHeader title="Contact details" />
          <View style={styles.card}>
            <ContactRow disabled={!staff.email} icon="mail-outline" label="Email" onPress={() => openContactUrl(`mailto:${staff.email}`, "No email application is available on this device.")} value={staff.email || "No email recorded"} />
            <ContactRow disabled={!staff.mobile_telephone} icon="call-outline" label="Phone" onPress={() => openContactUrl(`tel:${staff.mobile_telephone}`, "Calling is not available on this device.")} value={staff.mobile_telephone || "No phone recorded"} last />
          </View>
        </>
      ) : (
        <EmptyState text="Staff details are unavailable." />
      )}
    </Screen>
  );
}

function InfoTile({ icon, label, value }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return <View style={styles.infoTile}><View style={styles.infoIcon}><Ionicons name={icon} color={colors.primaryDark} size={17} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text numberOfLines={2} style={styles.infoValue}>{value}</Text></View></View>;
}

function ContactRow({ disabled = false, icon, label, last = false, onPress, value }: { disabled?: boolean; icon: ComponentProps<typeof Ionicons>["name"]; label: string; last?: boolean; onPress: () => void; value: string }) {
  return <Pressable accessibilityHint={disabled ? undefined : `Opens ${label === "Email" ? "your email app" : "the phone dialer"}`} accessibilityRole={disabled ? undefined : "link"} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.contactRow, last && styles.contactRowLast, pressed && styles.pressed]}><View style={styles.contactIcon}><Ionicons name={icon} color={colors.primaryDark} size={19} /></View><View style={styles.contactCopy}><Text style={styles.contactLabel}>{label}</Text><Text numberOfLines={2} style={styles.contactValue}>{value}</Text></View>{!disabled ? <Ionicons name="open-outline" color={colors.muted} size={17} /> : null}</Pressable>;
}

const styles = StyleSheet.create({
  avatar: { height: "100%", width: "100%" },
  avatarFallback: { alignItems: "center", backgroundColor: "white", borderColor: "rgba(255,255,255,0.5)", borderRadius: 50, borderWidth: 3, height: 100, justifyContent: "center", width: 100 },
  avatarFrame: { backgroundColor: "white", borderColor: "rgba(255,255,255,0.5)", borderRadius: 50, borderWidth: 3, height: 100, overflow: "hidden", shadowColor: "#022c22", shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.22, shadowRadius: 8, width: 100 },
  avatarInitials: { color: colors.primaryDark, fontSize: 27, fontWeight: "900" },
  avatarLoader: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.88)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden", paddingHorizontal: spacing.md },
  contactCopy: { flex: 1, minWidth: 0 },
  contactIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 11, height: 36, justifyContent: "center", width: 36 },
  contactLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  contactRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  contactRowLast: { borderBottomWidth: 0 },
  contactValue: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginTop: 2 },
  infoGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md, rowGap: spacing.sm },
  infoCopy: { flex: 1, minWidth: 0 },
  infoIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 10, height: 34, justifyContent: "center", width: 34 },
  infoLabel: { color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  infoTile: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexDirection: "row", flexGrow: 1, gap: spacing.sm, minHeight: 78, minWidth: 0, padding: spacing.sm },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "900", lineHeight: 17, marginTop: 2 },
  name: { color: "white", fontSize: 23, fontWeight: "900" },
  pageEyebrow: { color: colors.primaryDark, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  pageHeading: { marginBottom: spacing.md, marginTop: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: 2 },
  profileCard: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.lg, marginBottom: spacing.md, overflow: "hidden", padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 14 },
  profileCopy: { flex: 1, minWidth: 0 },
  profileMeta: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 3 },
  profileRole: { color: colors.gold, fontSize: 13, fontWeight: "800", marginTop: spacing.xs },
  photoAction: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md },
  photoActionCopy: { flex: 1 },
  photoActionIcon: { alignItems: "center", backgroundColor: "white", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  photoActionText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  photoActionTitle: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.7 }
});
