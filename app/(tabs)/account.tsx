import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { canChooseFromPhotoLibrary } from "@/features/shared/photoLibraryPermission";
import { ActivityIndicator, Alert, AppState, Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { authApi } from "@/api/services";
import { getErrorMessage, resolveResourceUrl } from "@/api/client";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/Polished";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { enablePushNotifications } from "@/features/notifications/notifications";

type PasswordField = "confirmPassword" | "currentPassword" | "newPassword";
type PermissionKey = "camera" | "contacts" | "notifications" | "photos";
type PermissionState = { canAskAgain: boolean; granted: boolean; label: string };
type ProfileForm = {
  bio: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
};

const emptyProfile: ProfileForm = { bio: "", email: "", firstName: "", lastName: "", username: "" };
const checkingPermission: PermissionState = { canAskAgain: true, granted: false, label: "Checking" };

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
  const { width } = useWindowDimensions();
  const wide = width >= 700;
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
  const [expandedSection, setExpandedSection] = useState<"permissions" | "profile" | "security" | "session" | null>("profile");
  const [permissionBusy, setPermissionBusy] = useState<PermissionKey | null>(null);
  const [permissionError, setPermissionError] = useState("");
  const [permissionMessage, setPermissionMessage] = useState("");
  const [permissions, setPermissions] = useState<Record<PermissionKey, PermissionState>>({
    camera: checkingPermission,
    contacts: checkingPermission,
    notifications: checkingPermission,
    photos: checkingPermission
  });
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

  const refreshPermissions = useCallback(async () => {
    const [camera, contacts, notifications, photos] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      Contacts.getPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      Platform.OS === "android" || Platform.OS === "web" ? null : ImagePicker.getMediaLibraryPermissionsAsync()
    ]);
    const permissionState = (response: { canAskAgain: boolean; granted: boolean }): PermissionState => ({
      canAskAgain: response.canAskAgain,
      granted: response.granted,
      label: response.granted ? "Allowed" : "Not allowed"
    });
    setPermissions({
      camera: permissionState(camera),
      contacts: permissionState(contacts),
      notifications: permissionState(notifications),
      photos: photos ? permissionState(photos) : { canAskAgain: false, granted: true, label: "System picker" }
    });
  }, []);

  useEffect(() => {
    void refreshPermissions();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermissions();
    });
    return () => subscription.remove();
  }, [refreshPermissions]);

  const avatarUri = resolveResourceUrl(user?.avatar_url || user?.profile_photo_url);
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
    if (!await canChooseFromPhotoLibrary()) {
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

  async function requestAppPermission(key: PermissionKey) {
    setPermissionError("");
    setPermissionMessage("");
    if (!permissions[key].canAskAgain && !permissions[key].granted) {
      await Linking.openSettings();
      return;
    }
    setPermissionBusy(key);
    try {
      if (key === "camera") await ImagePicker.requestCameraPermissionsAsync();
      if (key === "contacts") await Contacts.requestPermissionsAsync();
      if (key === "notifications") await enablePushNotifications();
      if (key === "photos" && Platform.OS !== "android" && Platform.OS !== "web") await ImagePicker.requestMediaLibraryPermissionsAsync();
      await refreshPermissions();
      setPermissionMessage("Permission settings updated.");
    } catch (err) {
      setPermissionError(getErrorMessage(err, "Could not update this permission."));
    } finally {
      setPermissionBusy(null);
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
      <View style={styles.accountShell}>
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
          <View style={wide ? styles.formRow : undefined}>
            <LabeledInput label="First name" onChangeText={(value) => updateProfileField("firstName", value)} placeholder="First name" value={profile.firstName} wrapperStyle={wide ? styles.formColumn : undefined} />
            <LabeledInput label="Last name" onChangeText={(value) => updateProfileField("lastName", value)} placeholder="Last name" value={profile.lastName} wrapperStyle={wide ? styles.formColumn : undefined} />
          </View>
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

      <AccountSection active={expandedSection === "permissions"} icon="options-outline" onPress={() => toggleSection("permissions")} subtitle="Camera, photos, contacts, and alerts" title="App permissions">
        <View style={styles.card}>
          <View style={styles.permissionIntro}><Ionicons name="shield-checkmark-outline" color={colors.primaryDark} size={20} /><Text style={styles.permissionIntroText}>You stay in control. Permissions are requested only when a feature needs them.</Text></View>
          <View style={styles.permissionGrid}>
            <PermissionCard icon="camera-outline" loading={permissionBusy === "camera"} onPress={() => requestAppPermission("camera")} state={permissions.camera} title="Camera" />
            <PermissionCard icon="images-outline" loading={permissionBusy === "photos"} onPress={() => requestAppPermission("photos")} state={permissions.photos} title="Photos" />
            <PermissionCard icon="people-outline" loading={permissionBusy === "contacts"} onPress={() => requestAppPermission("contacts")} state={permissions.contacts} title="Contacts" />
            <PermissionCard icon="notifications-outline" loading={permissionBusy === "notifications"} onPress={() => requestAppPermission("notifications")} state={permissions.notifications} title="Notifications" />
          </View>
          <Feedback error={permissionError} message={permissionMessage} />
          <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><Ionicons name="settings-outline" color={colors.primaryDark} size={18} /><Text style={styles.settingsButtonText}>Open device settings</Text></Pressable>
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
      </View>
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

function PermissionCard({ icon, loading, onPress, state, title }: { icon: React.ComponentProps<typeof Ionicons>["name"]; loading: boolean; onPress: () => void; state: PermissionState; title: string }) {
  const action = state.granted ? "Enabled" : state.canAskAgain ? "Allow" : "Settings";
  return (
    <View style={styles.permissionCard}>
      <View style={styles.permissionCardHeader}>
        <View style={[styles.permissionIcon, state.granted && styles.permissionIconActive]}><Ionicons name={icon} color={state.granted ? colors.success : colors.primaryDark} size={20} /></View>
        <View style={[styles.permissionBadge, state.granted && styles.permissionBadgeActive]}><View style={[styles.permissionDot, state.granted && styles.permissionDotActive]} /><Text numberOfLines={1} style={[styles.permissionStatus, state.granted && styles.permissionStatusActive]}>{state.label}</Text></View>
      </View>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Pressable accessibilityLabel={`${action} ${title}`} accessibilityRole="button" disabled={loading || state.granted} onPress={onPress} style={({ pressed }) => [styles.permissionAction, state.granted && styles.permissionActionActive, pressed && styles.pressed]}>
        {loading ? <ActivityIndicator color={colors.primaryDark} size="small" /> : <Text style={[styles.permissionActionText, state.granted && styles.permissionActionTextActive]}>{action}</Text>}
      </Pressable>
    </View>
  );
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
  accountShell: { alignSelf: "center", maxWidth: 840, width: "100%" },
  activeDot: { backgroundColor: colors.success, borderColor: "#dcfce7", borderRadius: 999, borderWidth: 4, height: 16, width: 16 },
  avatar: { borderRadius: 40, height: 80, width: 80 },
  avatarButton: { alignItems: "center", backgroundColor: colors.primary, borderColor: "white", borderRadius: 18, borderWidth: 2, bottom: -2, height: 36, justifyContent: "center", position: "absolute", right: -2, width: 36 },
  avatarText: { color: colors.primaryDark, fontSize: 23, fontWeight: "900" },
  avatarWrap: { alignItems: "center", backgroundColor: "white", borderColor: "rgba(255,255,255,0.5)", borderRadius: 42, borderWidth: 3, height: 84, justifyContent: "center", width: 84 },
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
  formColumn: { flex: 1 },
  formRow: { flexDirection: "row", gap: spacing.md },
  groupLabel: { color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, marginBottom: spacing.sm, marginLeft: spacing.xs, textTransform: "uppercase" },
  helpText: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
  hero: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: radius.lg, flexDirection: "row", gap: spacing.lg, marginBottom: spacing.xl, overflow: "hidden", padding: spacing.lg, shadowColor: "#064e3b", shadowOffset: { height: 5, width: 0 }, shadowOpacity: 0.2, shadowRadius: 14 },
  heroCopy: { flex: 1, minWidth: 0 },
  iconButton: { alignItems: "center", height: 50, justifyContent: "center", width: 50 },
  input: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  inputGroup: { marginBottom: spacing.md },
  label: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: spacing.xs },
  muted: { color: "rgba(255,255,255,0.76)", lineHeight: 20, marginTop: spacing.xs },
  name: { color: "white", fontSize: 22, fontWeight: "900" },
  pageEyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  pageHeading: { marginBottom: spacing.lg, marginTop: spacing.sm },
  pageSubtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: "900", marginTop: spacing.xs },
  passwordInput: { color: colors.text, flex: 1, fontSize: 16, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  passwordRow: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row" },
  permissionAction: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.primaryDark, borderRadius: radius.md, justifyContent: "center", minHeight: 36, paddingHorizontal: spacing.sm },
  permissionActionActive: { backgroundColor: "#dcfce7" },
  permissionActionText: { color: "white", fontSize: 11, fontWeight: "900" },
  permissionActionTextActive: { color: colors.success },
  permissionBadge: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 999, flexDirection: "row", gap: 5, maxWidth: "65%", paddingHorizontal: 7, paddingVertical: 5 },
  permissionBadgeActive: { backgroundColor: "#dcfce7" },
  permissionCard: { backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexBasis: "47%", flexGrow: 1, justifyContent: "space-between", minHeight: 142, minWidth: 0, padding: spacing.md },
  permissionCardHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  permissionDot: { backgroundColor: colors.muted, borderRadius: 4, height: 6, width: 6 },
  permissionDotActive: { backgroundColor: colors.success },
  permissionGrid: { columnGap: spacing.sm, flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md, rowGap: spacing.sm },
  permissionIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  permissionIconActive: { backgroundColor: "#dcfce7" },
  permissionIntro: { alignItems: "flex-start", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  permissionIntroText: { color: colors.primaryDark, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  permissionStatus: { color: colors.muted, flexShrink: 1, fontSize: 9, fontWeight: "800" },
  permissionStatusActive: { color: colors.success },
  permissionTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginVertical: spacing.sm },
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
  settingsButton: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  settingsButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: "900" },
  subTitle: { color: colors.text, fontSize: 17, fontWeight: "900", marginBottom: spacing.xs },
  success: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  successText: { color: colors.success },
  textArea: { minHeight: 104, paddingTop: spacing.md, textAlignVertical: "top" }
});
