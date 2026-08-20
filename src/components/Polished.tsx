import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function StatusBadge({ tone = "neutral", text }: { tone?: "success" | "warning" | "danger" | "info" | "neutral"; text: string }) {
  return <Text style={[styles.badge, styles[`${tone}Badge`]]}>{text}</Text>;
}

export function SectionHeader({ actionLabel, onAction, subtitle, title }: { actionLabel?: string; onAction?: () => void; subtitle?: string; title: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTop}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" color={colors.primaryDark} size={16} />
          </Pressable>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function NoticeBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.notice}>
      <Ionicons name="information-circle" color={colors.primaryDark} size={18} />
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

export function FeatureCard({
  accent = colors.primary,
  icon,
  meta,
  onPress,
  subtitle,
  title,
  value
}: {
  accent?: string;
  icon?: IconName;
  meta?: string;
  onPress?: () => void;
  subtitle: string;
  title: string;
  value?: string | number;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.feature, pressed && styles.pressed]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: accent }]}>
          <Ionicons name={icon} color="white" size={22} />
        </View>
      ) : null}
      <View style={styles.featureBody}>
        <View style={styles.featureHeader}>
          <Text style={styles.featureTitle}>{title}</Text>
          {value !== undefined ? (
            <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={styles.featureValue}>
              {value}
            </Text>
          ) : null}
        </View>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
        {meta ? <Text style={styles.featureMeta}>{meta}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" color={colors.muted} size={20} /> : null}
    </Pressable>
  );
}

export function AmountRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "success" | "danger" | "neutral" }) {
  return (
    <View style={styles.amountRow}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, tone === "success" && styles.successText, tone === "danger" && styles.dangerText]}>{value}</Text>
    </View>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTitle} />
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.skeletonLine, index === rows - 1 && styles.skeletonShort]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  amountLabel: { color: colors.muted, fontWeight: "700" },
  amountRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  amountValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  badge: { alignSelf: "flex-start", borderRadius: 999, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textTransform: "uppercase" },
  dangerBadge: { backgroundColor: "#fee2e2", color: colors.danger },
  dangerText: { color: colors.danger },
  feature: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.lg, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14 },
  featureBody: { flex: 1, minWidth: 0 },
  featureHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  featureMeta: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  featureSubtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  featureTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: "900" },
  featureValue: { color: colors.text, flexShrink: 1, fontSize: 18, fontWeight: "900", minWidth: 0, textAlign: "right" },
  iconWrap: { alignItems: "center", borderRadius: 18, height: 50, justifyContent: "center", width: 50 },
  infoBadge: { backgroundColor: colors.accentSoft, color: colors.accent },
  neutralBadge: { backgroundColor: "#f1f5f9", color: colors.muted },
  notice: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  noticeText: { color: colors.primaryDark, flex: 1, fontWeight: "700", lineHeight: 20 },
  pressed: { opacity: 0.78 },
  section: { marginBottom: spacing.md, marginTop: spacing.sm },
  sectionAction: { alignItems: "center", flexDirection: "row", gap: spacing.xs, paddingVertical: spacing.xs },
  sectionActionText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  sectionSubtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  sectionTop: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  skeletonCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, marginBottom: spacing.md, padding: spacing.lg },
  skeletonLine: { backgroundColor: "#e2e8f0", borderRadius: radius.sm, height: 12, width: "100%" },
  skeletonShort: { width: "58%" },
  skeletonTitle: { backgroundColor: "#cbd5e1", borderRadius: radius.sm, height: 18, width: "44%" },
  successBadge: { backgroundColor: "#dcfce7", color: colors.success },
  successText: { color: colors.success },
  warningBadge: { backgroundColor: "#fef3c7", color: colors.warning }
});
