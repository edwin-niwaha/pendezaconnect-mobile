import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.root}>
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.title}>Pendeza Connect needs to recover</Text>
          <Text style={styles.message}>
            An unexpected problem occurred. Your password and account details have not been shown or included in this message.
          </Text>
          <Pressable accessibilityRole="button" onPress={this.retry} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.surface, fontWeight: "900" },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    width: "100%"
  },
  message: { color: colors.muted, lineHeight: 21, marginTop: spacing.sm },
  root: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" }
});
