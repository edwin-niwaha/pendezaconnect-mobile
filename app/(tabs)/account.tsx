import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { authApi } from "@/api/services";
import { getErrorMessage } from "@/api/client";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/Polished";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { enablePushNotifications } from "@/features/notifications/notifications";

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
  const [expandedSection, setExpandedSection] = useState<"notifications" | "profile" | "security" | "session" | null>("profile");
  const [notificationError, setNotificationError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSaving, setNotificationSaving] = useState(false);
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

  function toggleSection(section: Exclude<typeof expandedSection, null>) {
    setExpandedSection((current) => current === section ? null : section);
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

  async function turnOnNotifications() {
    setNotificationError("");
    setNotificationMessage("");
    setNotificationSaving(true);
    try {
      await enablePushNotifications();
      setNotificationMessage("Notifications are enabled for this device.");
    } catch (err) {
      setNotificationError(getErrorMessage(err, "Could not enable notifications."));
    } finally {
      setNotificationSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out of this device?", [
      { style: "cancel", text: "Cancel" },
      { onPress: signOut, style: "destructive", text: "Sign out" }
    ]);
  }

  return (
    <Screen>
      <View style={styles.pageHeading}>
        <Text style={styles.pageEyebrow}>Settings</Text>
        <Text style={styles.pageTitle}>Your account</Text>
        <Text style={styles.pageSubtitle}>Manage your personal details, security, notifications, and signed-in device.</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          {displayedAvatarUri ? <Image source={{ uri: displayedAvatarUri }} style={styles.avatar} /> : <Text style={styles.avatarText}>{initials(user?.first_name, user?.last_name, user?.username)}</Text>}
          <Pressable accessibilityLabel="Change profile photo" accessibilityRole="button" disabled={avatarSaving} onPress={pickAvatar} style={styles.avatarButton}>
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

      <Text style={styles.groupLabel}>Account settings</Text>
      <AccountSection active={expandedSection === "profile"} icon="person-outline" onPress={() => toggleSection("profile")} subtitle="Name, email, photo, and bio" title="Profile">
        <View style={styles.card}>
          <LabeledInput label="Username" onChangeText={(value) => updateProfileField("username", value)} placeholder="Your username" value={profile.username} autoCapitalize="none" />
          <Text style={styles.fieldHint}>3–100 letters, numbers, dots, dashes, or underscores.</Text>
          <LabeledInput label="First name" onChangeText={(value) => updateProfileField("firstName", value)} placeholder="First name" value={profile.firstName} />
          <LabeledInput label="Last name" onChangeText={(value) => updateProfileField("lastName", value)} placeholder="Last name" value={profile.lastName} />
          <LabeledInput label="Email address" onChangeText={(value) => updateProfileField("email", value)} placeholder="name@example.com" value={profile.email} autoCapitalize="none" keyboardType="email-address" />
          <LabeledInput label="About you" onChangeText={(value) => updateProfileField("bio", value)} placeholder="A short introduction (optional)" value={profile.bio} maxLength={500} multiline />
          <Text style={styles.fieldHint}>{profile.bio.trim().length}/500 characters</Text>
          <Feedback error={profileError} message={profileMessage} />
          <PrimaryButton icon="save-outline" loading={profileSaving} onPress={saveProfile} text="Save changes" />
        </View>
      </AccountSection>

      <AccountSection active={expandedSection === "security"} icon="shield-checkmark-outline" onPress={() => toggleSection("security")} subtitle="Password and recovery options" title="Account & security">
        <View style={styles.card}>
          <View style={styles.sectionIntro}><Ionicons name="lock-closed-outline" color={colors.primaryDark} size={20} /><Text style={styles.sectionIntroText}>Use at least 8 characters with a letter and a number.</Text></View>
          <PasswordInput label="Current password" onToggle={() => togglePassword("currentPassword")} onChangeText={setCurrentPassword} placeholder="Enter current password" secure={!visiblePasswords.currentPassword} value={currentPassword} />
          <PasswordInput label="New password" onToggle={() => togglePassword("newPassword")} onChangeText={setNewPassword} placeholder="Create a new password" secure={!visiblePasswords.newPassword} value={newPassword} />
          <PasswordInput label="Confirm new password" onToggle={() => togglePassword("confirmPassword")} onChangeText={setConfirmPassword} placeholder="Repeat new password" secure={!visiblePasswords.confirmPassword} value={confirmPassword} />
          <Feedback error={passwordError} message={passwordMessage} />
          <PrimaryButton icon="lock-closed-outline" loading={passwordSaving} onPress={savePassword} text="Change password" />

          <View style={styles.divider} />
          <Text style={styles.subTitle}>Password recovery</Text>
          <Text style={styles.helpText}>Send reset instructions to your account email if you cannot sign in later.</Text>
          <LabeledInput label="Recovery email" onChangeText={setResetEmail} placeholder="name@example.com" value={resetEmail} autoCapitalize="none" keyboardType="email-address" />
          <Feedback error={resetError} message={resetMessage} />
          <SecondaryButton icon="mail-outline" loading={resetSending} onPress={sendResetLink} text="Send reset instructions" />
        </View>
      </AccountSection>

      <AccountSection active={expandedSection === "notifications"} icon="notifications-outline" onPress={() => toggleSection("notifications")} subtitle="Private alerts on this device" title="Notifications">
        <View style={styles.card}>
          <Text style={styles.subTitle}>Stay informed</Text>
          <Text style={styles.helpText}>Receive useful updates without exposing sensitive account information.</Text>
          <SettingDetail icon="cash-outline" text="Loan and repayment updates" />
          <SettingDetail icon="wallet-outline" text="Savings and payment activity" />
          <SettingDetail icon="shield-checkmark-outline" text="Important account-security changes" />
          <View style={styles.privacyNote}><Ionicons name="eye-off-outline" color={colors.muted} size={18} /><Text style={styles.privacyText}>Sensitive details stay hidden from notification previews.</Text></View>
          <Feedback error={notificationError} message={notificationMessage} />
          <PrimaryButton icon="notifications-outline" loading={notificationSaving} onPress={turnOnNotifications} text="Enable notifications" />
        </View>
      </AccountSection>

      <AccountSection active={expandedSection === "session"} icon="phone-portrait-outline" onPress={() => toggleSection("session")} subtitle="Current device and sign out" title="Session">
        <View style={styles.card}>
          <View style={styles.deviceRow}>
            <View style={styles.deviceIcon}><Ionicons name="phone-portrait-outline" color={colors.primaryDark} size={22} /></View>
            <View style={styles.deviceCopy}><Text style={styles.deviceTitle}>This device</Text><Text style={styles.deviceText}>Signed in as {profile.username || "this user"}</Text></View>
            <View style={styles.activeDot} />
          </View>
          <Text style={styles.helpText}>Signing out removes your session from this device only. Your account and information remain safe.</Text>
          <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
            <Ionicons name="log-out-outline" color={colors.danger} size={18} />
            <Text style={styles.signOutText}>Sign out of this device</Text>
          </Pressable>
        </View>
      </AccountSection>
    </Screen>
  );
}

function AccountSection({
  active,
  children,
  icon,
  onPress,
  subtitle,
  title
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={[styles.sectionWrap, active && styles.sectionWrapActive]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: active }} onPress={onPress} style={({ pressed }) => [styles.sectionButton, active && styles.sectionButtonActive, pressed && styles.pressed]}>
        <View style={[styles.sectionIcon, active && styles.sectionIconActive]}>
          <Ionicons name={icon} color={colors.primaryDark} size={20} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.chevron}><Ionicons name={active ? "chevron-up" : "chevron-down"} color={active ? colors.primaryDark : colors.muted} size={18} /></View>
      </Pressable>
      {active ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
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
  if (error) return <View accessibilityLiveRegion="polite" style={[styles.feedback, styles.error]}><Ionicons name="alert-circle-outline" color={colors.danger} size={19} /><Text style={[styles.feedbackText, styles.errorText]}>{error}</Text></View>;
  if (message) return <View accessibilityLiveRegion="polite" style={[styles.feedback, styles.success]}><Ionicons name="checkmark-circle-outline" color={colors.success} size={19} /><Text style={[styles.feedbackText, styles.successText]}>{message}</Text></View>;
  return null;
}

function SettingDetail({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return <View style={styles.settingDetail}><View style={styles.settingDetailIcon}><Ionicons name={icon} color={colors.primaryDark} size={18} /></View><Text style={styles.settingDetailText}>{text}</Text><Ionicons name="checkmark" color={colors.success} size={18} /></View>;
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
  activeDot: { backgroundColor: colors.success, borderColor: "#dcfce7", borderRadius: 999, borderWidth: 4, height: 16, width: 16 },
  avatar: { borderRadius: 40, height: 80, width: 80 },
  avatarButton: { alignItems: "center", backgroundColor: colors.primary, borderColor: "white", borderRadius: 18, borderWidth: 2, bottom: -2, height: 36, justifyContent: "center", position: "absolute", right: -2, width: 36 },
  avatarText: { color: colors.primaryDark, fontSize: 23, fontWeight: "900" },
  avatarWrap: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "white", borderRadius: 42, borderWidth: 3, height: 84, justifyContent: "center", width: 84 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  card: { padding: spacing.lg },
  chevron: { alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 999, height: 32, justifyContent: "center", width: 32 },
  deviceCopy: { flex: 1 },
  deviceIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 44, justifyContent: "center", width: 44 },
  deviceRow: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, padding: spacing.md },
  deviceText: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  deviceTitle: { color: colors.text, fontWeight: "900" },
  disabled: { opacity: 0.62 },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.xl },
  error: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  errorText: { color: colors.danger },
  feedback: { alignItems: "flex-start", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  fieldHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md, marginTop: -spacing.sm, textAlign: "right" },
  groupLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase" },
  helpText: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
  hero: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.lg, marginBottom: spacing.xl, padding: spacing.lg, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 14 },
  heroCopy: { flex: 1, minWidth: 0 },
  iconButton: { alignItems: "center", height: 50, justifyContent: "center", width: 50 },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  inputGroup: { marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs },
  muted: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  name: { color: colors.text, fontSize: 21, fontWeight: "900" },
  pageEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  pageHeading: { marginBottom: spacing.lg, marginTop: spacing.sm },
  pageSubtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: spacing.xs },
  passwordInput: { color: colors.text, flex: 1, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  passwordRow: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row" },
  pressed: { opacity: 0.74 },
  primaryButton: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  primaryButtonText: { color: "white", fontSize: 15, fontWeight: "900" },
  privacyNote: { alignItems: "flex-start", backgroundColor: "#f8fafc", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm, padding: spacing.md },
  privacyText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  secondaryButton: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "#99f6e4", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  secondaryButtonText: { color: colors.primaryDark, fontSize: 14, fontWeight: "900" },
  sectionButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: "row", gap: spacing.md, minHeight: 76, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  sectionButtonActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sectionContent: { borderTopColor: colors.border, borderTopWidth: 1 },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionIcon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 16, height: 44, justifyContent: "center", width: 44 },
  sectionIconActive: { backgroundColor: colors.primarySoft },
  sectionIntro: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg, padding: spacing.md },
  sectionIntroText: { color: colors.primaryDark, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  sectionWrap: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md, overflow: "hidden" },
  sectionWrapActive: { borderColor: "#99f6e4", shadowColor: "#0f172a", shadowOpacity: 0.04, shadowRadius: 10 },
  settingDetail: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 52, paddingVertical: spacing.sm },
  settingDetailIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 12, height: 34, justifyContent: "center", width: 34 },
  settingDetailText: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  signOutButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  signOutText: { color: colors.danger, fontWeight: "900" },
  subTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.xs },
  success: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  successText: { color: colors.success },
  textArea: { minHeight: 104, paddingTop: spacing.md, textAlignVertical: "top" }
});
