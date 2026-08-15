import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" color={colors.muted} size={18} />
      <TextInput
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => onChangeText("")}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
        >
          <Ionicons name="close-circle" color={colors.muted} size={21} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  container: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.xs },
  input: { color: colors.text, flex: 1, minHeight: 46, minWidth: 0, paddingVertical: spacing.sm },
  pressed: { opacity: 0.65 }
});
