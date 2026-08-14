import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { authApi } from "@/api/services";
import { getErrorMessage } from "@/api/client";
import { Screen } from "@/components/Screen";
import { SectionHeader, StatusBadge } from "@/components/Polished";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

type PasswordField = "confirmPassword" | "currentPassword" | "newPassword";
type ProfileForm = {
  bio: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
};

const emptyProfile: ProfileForm = { bio: "", email: "", firstName: "", lastName: "", username: "" };

function initials(firstName = "", lastName = "", username = "") {
  const value = `${firstName.charAt(0)}${lastName.charAt(0)}` || username.slice(0, 2);
  return value.toUpperCase() || "PC";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string) {
  return /^[A-Za-z0-9_.-]{3,100}$/.test(username);
}

export default function Account() {
  const { user, logout, refreshMe } = useAuth();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<PasswordField, boolean>>({
    confirmPassword: false,
    currentPassword: false,
    newPassword: false
  });

  useEffect(() => {
    setProfile({
      bio: user?.bio || "",
      email: user?.email || "",
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      username: user?.username || ""
    });
    setResetEmail(user?.email || "");
  }, [user]);

  const avatarUri = user?.avatar_url || user?.profile_photo_url || "";
  const displayedAvatarUri = avatarUri ? `${avatarUri}${avatarUri.includes("?") ? "&" : "?"}v=${avatarVersion}` : "";
  const displayName = useMemo(() => {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    return name || profile.username || "Your account";
  }, [profile.firstName, profile.lastName, profile.username]);

  function updateProfileField(field: keyof ProfileForm, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function togglePassword(field: PasswordField) {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  }

  function validateProfile() {
    if (!profile.username.trim()) return "Username is required.";
    if (!isValidUsername(profile.username.trim())) return "Username must be 3-100 characters and use only letters, numbers, dots, dashes, or underscores.";
    if (!profile.email.trim()) return "Email is required.";
    if (!isValidEmail(profile.email.trim())) return "Enter a valid email address.";
    if (profile.firstName.trim().length > 150) return "First name must be 150 characters or fewer.";
    if (profile.lastName.trim().length > 150) return "Last name must be 150 characters or fewer.";
    if (profile.bio.trim().length > 500) return "Bio must be 500 characters or fewer.";
    return "";
  }

  async function saveProfile() {
    const validation = validateProfile();
    setProfileError(validation);
    setProfileMessage("");
    if (validation) return;
    setProfileSaving(true);
    try {
      await authApi.updateProfile({
        bio: profile.bio.trim(),
        email: profile.email.trim(),
        first_name: profile.firstName.trim(),
        last_name: profile.lastName.trim(),
        username: profile.username.trim()
      });
      await refreshMe();
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(getErrorMessage(err, "Could not update your profile."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function pickAvatar() {
    setProfileError("");
    setProfileMessage("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileError("Photo library permission is required to change your avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.82
    });
    if (result.canceled) return;
    setAvatarSaving(true);
    try {
      await authApi.uploadAvatar(result.assets[0]);
      await refreshMe();
      setAvatarVersion(Date.now());
      setProfileMessage("Avatar updated successfully.");
    } catch (err) {
      setProfileError(getErrorMessage(err, "Could not upload your avatar."));
    } finally {
      setAvatarSaving(false);
    }
  }

  function validatePassword() {
    if (!currentPassword) return "Current password is required.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return "New password must include at least one letter and one number.";
    if (newPassword !== confirmPassword) return "New password and confirmation do not match.";
    if (currentPassword === newPassword) return "Choose a new password that is different from your current password.";
    return "";
  }

  async function savePassword() {
    const validation = validatePassword();
    setPasswordError(validation);
    setPasswordMessage("");
    if (validation) return;
    setPasswordSaving(true);
    try {
      const response = await authApi.changePassword({
        confirm_password: confirmPassword,
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(response.detail || "Password changed successfully.");
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Could not change your password."));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function sendResetLink() {
    setResetError("");
    setResetMessage("");
    const email = resetEmail.trim();
    if (!email || !isValidEmail(email)) {
      setResetError("Enter the email address connected to your account.");
      return;
    }
    setResetSending(true);
    try {
      const response = await authApi.requestPasswordReset({ email });
      setResetMessage(response.detail || "Password reset instructions have been sent.");
    } catch (err) {
      setResetError(getErrorMessage(err, "Could not request a password reset."));
    } finally {
      setResetSending(false);
    }
  }

  async function signOut() {
    await logout();
    router.replace("/auth/login");
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out of this device?", [
      { style: "cancel", text: "Cancel" },
      { onPress: signOut, style: "destructive", text: "Sign out" }
    ]);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          {displayedAvatarUri ? <Image source={{ uri: displayedAvatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>{initials(user?.first_name, user?.last_name, user?.username)}</Text>}
          <Pressable disabled={avatarSaving} onPress={pickAvatar} style={styles.avatarButton}>
            {avatarSaving ? <ActivityIndicator color="white" size="small" /> : <Ionicons name="camera" color="white" size={16} />}
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.muted}>{user?.email || "No email added"}</Text>
          <View style={styles.badges}>
            {user?.role ? <StatusBadge text={user.role} tone="info" /> : null}
            {user?.account_type ? <StatusBadge text={user.account_type} tone="neutral" /> : null}
          </View>
        </View>
      </View>

      <SectionHeader title="Profile" subtitle="Keep your account details current across Pendeza Connect." />
      <View style={styles.card}>
        <LabeledInput label="Username" onChangeText={(value) => updateProfileField("username", value)} value={profile.username} autoCapitalize="none" />
        <Text style={styles.fieldHint}>Use 3-100 letters, numbers, dots, dashes, or underscores.</Text>
        <View style={styles.twoColumn}>
          <LabeledInput label="First name" onChangeText={(value) => updateProfileField("firstName", value)} value={profile.firstName} wrapperStyle={styles.columnInput} />
          <LabeledInput label="Last name" onChangeText={(value) => updateProfileField("lastName", value)} value={profile.lastName} wrapperStyle={styles.columnInput} />
        </View>
        <LabeledInput label="Email" onChangeText={(value) => updateProfileField("email", value)} value={profile.email} autoCapitalize="none" keyboardType="email-address" />
        <LabeledInput label="Bio" onChangeText={(value) => updateProfileField("bio", value)} value={profile.bio} maxLength={500} multiline />
        <Text style={styles.fieldHint}>{profile.bio.trim().length}/500 characters</Text>
        <Feedback error={profileError} message={profileMessage} />
        <PrimaryButton icon="save-outline" loading={profileSaving} onPress={saveProfile} text="Save profile" />
      </View>

      <SectionHeader title="Security" subtitle="Manage password changes and recovery options." />
      <View style={styles.card}>
        <PasswordInput label="Current password" onToggle={() => togglePassword("currentPassword")} onChangeText={setCurrentPassword} secure={!visiblePasswords.currentPassword} value={currentPassword} />
        <PasswordInput label="New password" onToggle={() => togglePassword("newPassword")} onChangeText={setNewPassword} secure={!visiblePasswords.newPassword} value={newPassword} />
        <PasswordInput label="Confirm new password" onToggle={() => togglePassword("confirmPassword")} onChangeText={setConfirmPassword} secure={!visiblePasswords.confirmPassword} value={confirmPassword} />
        <Feedback error={passwordError} message={passwordMessage} />
        <PrimaryButton icon="lock-closed-outline" loading={passwordSaving} onPress={savePassword} text="Change password" />

        <View style={styles.divider} />
        <Text style={styles.subTitle}>Forgot password</Text>
        <Text style={styles.helpText}>Send reset instructions to your account email if you cannot sign in later.</Text>
        <LabeledInput label="Reset email" onChangeText={setResetEmail} value={resetEmail} autoCapitalize="none" keyboardType="email-address" />
        <Feedback error={resetError} message={resetMessage} />
        <SecondaryButton icon="mail-outline" loading={resetSending} onPress={sendResetLink} text="Send reset instructions" />
      </View>

      <SectionHeader title="Session" />
      <View style={styles.card}>
        <Text style={styles.helpText}>Signed in as {profile.username || "this user"}. Signing out only affects this device.</Text>
        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" color={colors.danger} size={18} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function LabeledInput({
  label,
  wrapperStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; wrapperStyle?: object }) {
  return (
    <View style={[styles.inputGroup, wrapperStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={[styles.input, props.multiline && styles.textArea]} {...props} />
    </View>
  );
}

function PasswordInput({ label, onToggle, secure, ...props }: React.ComponentProps<typeof TextInput> & { label: string; onToggle: () => void; secure: boolean }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput placeholderTextColor="#94a3b8" secureTextEntry={secure} style={styles.passwordInput} {...props} />
        <Pressable accessibilityRole="button" accessibilityLabel={secure ? `Show ${label}` : `Hide ${label}`} onPress={onToggle} style={styles.iconButton}>
          <Ionicons name={secure ? "eye-outline" : "eye-off-outline"} color={colors.muted} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function Feedback({ error, message }: { error: string; message: string }) {
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (message) return <Text style={styles.success}>{message}</Text>;
  return null;
}

function PrimaryButton({ icon, loading, onPress, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; loading: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color="white" /> : <Ionicons name={icon} color="white" size={18} />}
      <Text style={styles.primaryButtonText}>{loading ? "Please wait..." : text}</Text>
    </Pressable>
  );
}

function SecondaryButton({ icon, loading, onPress, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; loading: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, loading && styles.disabled]}>
      {loading ? <ActivityIndicator color={colors.primaryDark} /> : <Ionicons name={icon} color={colors.primaryDark} size={18} />}
      <Text style={styles.secondaryButtonText}>{loading ? "Please wait..." : text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 44, height: 88, width: 88 },
  avatarButton: { alignItems: "center", backgroundColor: colors.primary, borderColor: "white", borderRadius: 18, borderWidth: 2, bottom: -2, height: 36, justifyContent: "center", position: "absolute", right: -2, width: 36 },
  avatarText: { color: colors.primaryDark, fontSize: 24, fontWeight: "900" },
  avatarWrap: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 44, height: 88, justifyContent: "center", width: 88 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
  columnInput: { flex: 1 },
  disabled: { opacity: 0.68 },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.lg },
  error: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, color: colors.danger, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  fieldHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md, marginTop: -spacing.sm },
  helpText: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
  hero: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, padding: spacing.lg },
  heroCopy: { flex: 1 },
  iconButton: { alignItems: "center", height: 46, justifyContent: "center", width: 46 },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, padding: spacing.md },
  inputGroup: { marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 12, fontWeight: "900", marginBottom: spacing.xs, textTransform: "uppercase" },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 22, fontWeight: "900" },
  passwordInput: { color: colors.text, flex: 1, padding: spacing.md },
  passwordRow: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row" },
  pressed: { opacity: 0.78 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.md },
  primaryButtonText: { color: "white", fontWeight: "900" },
  secondaryButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.md },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: "900" },
  signOutButton: { alignItems: "center", alignSelf: "flex-start", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  signOutText: { color: colors.danger, fontWeight: "900" },
  subTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.xs },
  success: { backgroundColor: "#dcfce7", borderColor: "#bbf7d0", borderRadius: radius.md, borderWidth: 1, color: colors.success, fontWeight: "700", marginBottom: spacing.md, padding: spacing.md },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  twoColumn: { flexDirection: "row", gap: spacing.md }
});
