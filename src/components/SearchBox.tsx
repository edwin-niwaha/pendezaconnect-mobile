import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} style={styles.input} placeholderTextColor={colors.muted} />;
}

const styles = StyleSheet.create({
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, marginBottom: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }
});