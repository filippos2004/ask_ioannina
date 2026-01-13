import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from "react-native";

/**
 * ✅ Βάλε σωστό base URL:
 * - Android Emulator: http://10.0.2.2:8000
 * - iOS Simulator:   http://localhost:8000
 * - Πραγματική συσκευή: http://<IP_υπολογιστή_σου>:8000
 */
const API_BASE_URL =
    Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
        (data && (data.detail || data.message)) ||
        (typeof data === "string" ? data : null) ||
        `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

export default function App() {
  const [screen, setScreen] = useState("login"); // "login" | "signup"
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  const onLoggedIn = (tokens) => {
    setAccessToken(tokens?.accessToken || null);
    setRefreshToken(tokens?.refreshToken || null);
    Alert.alert("OK", "Σύνδεση επιτυχής ✅");
  };

  const onSignedUp = (tokens) => {
    setAccessToken(tokens?.accessToken || null);
    setRefreshToken(tokens?.refreshToken || null);
    Alert.alert("OK", "Εγγραφή επιτυχής ✅ (έγινε και login)");
    setScreen("login");
  };

  return (
      <ImageBackground
          source={require("./assets/images5.png")}
          resizeMode="contain"
          style={styles.safe}
      >
        <KeyboardAvoidingView
            style={styles.headcont}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.appheader}>
            <Text style={styles.appTitle}>IOANNINA_LOVERS</Text>
          </View>
        </KeyboardAvoidingView>

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {screen === "login" ? (
              <LoginCard
                  onLogin={onLoggedIn}
                  goSignup={() => setScreen("signup")}
              />
          ) : (
              <SignupCard
                  onSignup={onSignedUp}
                  goLogin={() => setScreen("login")}
              />
          )}

          {/* μικρό debug (προαιρετικό) */}
          {!!accessToken && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenTitle}>Token (για POIs endpoints)</Text>
                <Text style={styles.tokenText} numberOfLines={2}>
                  {accessToken}
                </Text>
              </View>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>
  );
}

function LoginCard({ onLogin, goSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => password.length >= 6, [password]);
  const canSubmit = emailOk && passOk && !loading;

  const handleLogin = async () => {
    const e = email.trim().toLowerCase();

    if (!emailOk) return Alert.alert("Σφάλμα", "Βάλε έγκυρο email.");
    if (!passOk) return Alert.alert("Σφάλμα", "Ο κωδικός πρέπει να έχει ≥ 6 χαρακτήρες.");

    setLoading(true);
    try {
      const tokens = await apiPost("/api/auth/login", { email: e, password });
      onLogin(tokens);
    } catch (err) {
      Alert.alert("Αποτυχία", err.message || "Κάτι πήγε λάθος.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Σύνδεση στον λογαριασμό σου</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="π.χ. demo@demo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, email.length > 0 && !emailOk ? styles.inputError : null]}
        />
        {email.length > 0 && !emailOk && <Text style={styles.helperError}>Μη έγκυρο email</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="τουλάχιστον 6 χαρακτήρες"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={[styles.input, styles.passInput, password.length > 0 && !passOk ? styles.inputError : null]}
          />
          <TouchableOpacity
              onPress={() => setShowPass((s) => !s)}
              style={styles.showBtn}
              accessibilityRole="button"
          >
            <Text style={styles.showBtnText}>{showPass ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>
        {password.length > 0 && !passOk && <Text style={styles.helperError}>Πολύ μικρός κωδικός</Text>}

        <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit}
            style={[styles.loginBtn, !canSubmit ? styles.loginBtnDisabled : null]}
            accessibilityRole="button"
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.loginBtnText}>Σύνδεση</Text>}
        </TouchableOpacity>

        <TouchableOpacity
            onPress={() =>
                Alert.alert(
                    "Tip",
                    "Το API που έχεις είναι demo και έχει default χρήστη: demo@demo.com / demo1234 (εκτός αν κάνεις εγγραφή)."
                )
            }
            style={styles.linkBtn}
            accessibilityRole="button"
        >
          <Text style={styles.linkText}>Ξέχασες τον κωδικό;</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goSignup} style={styles.linkBtn} accessibilityRole="button">
          <Text style={styles.linkText}>Δεν έχεις λογαριασμό; Φτιάξε έναν</Text>
        </TouchableOpacity>
      </View>
  );
}

function SignupCard({ onSignup, goLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => password.length >= 6, [password]);
  const matchOk = useMemo(() => password2.length > 0 && password2 === password, [password2, password]);

  const canSubmit = emailOk && passOk && matchOk && !loading;

  const handleSignup = async () => {
    const e = email.trim().toLowerCase();

    if (!emailOk) return Alert.alert("Σφάλμα", "Βάλε έγκυρο email.");
    if (!passOk) return Alert.alert("Σφάλμα", "Ο κωδικός πρέπει να έχει ≥ 6 χαρακτήρες.");
    if (!matchOk) return Alert.alert("Σφάλμα", "Οι κωδικοί δεν ταιριάζουν.");

    setLoading(true);
    try {
      const tokens = await apiPost("/api/auth/signup", { email: e, password });
      onSignup(tokens);
    } catch (err) {
      if (err.status === 409) {
        Alert.alert("Υπάρχει ήδη", "Υπάρχει ήδη λογαριασμός με αυτό το email.");
      } else {
        Alert.alert("Αποτυχία", err.message || "Κάτι πήγε λάθος.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.card}>
        <Text style={styles.title}>Sign Up</Text>
        <Text style={styles.subtitle}>Φτιάξε νέο λογαριασμό</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="π.χ. you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, email.length > 0 && !emailOk ? styles.inputError : null]}
        />
        {email.length > 0 && !emailOk && <Text style={styles.helperError}>Μη έγκυρο email</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="τουλάχιστον 6 χαρακτήρες"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              style={[styles.input, styles.passInput, password.length > 0 && !passOk ? styles.inputError : null]}
          />
          <TouchableOpacity
              onPress={() => setShowPass((s) => !s)}
              style={styles.showBtn}
              accessibilityRole="button"
          >
            <Text style={styles.showBtnText}>{showPass ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>
        {password.length > 0 && !passOk && <Text style={styles.helperError}>Πολύ μικρός κωδικός</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Confirm Password</Text>
        <TextInput
            value={password2}
            onChangeText={setPassword2}
            placeholder="ξανά τον κωδικό"
            secureTextEntry={!showPass}
            autoCapitalize="none"
            style={[styles.input, password2.length > 0 && !matchOk ? styles.inputError : null]}
        />
        {password2.length > 0 && !matchOk && <Text style={styles.helperError}>Δεν ταιριάζουν οι κωδικοί</Text>}

        <TouchableOpacity
            onPress={handleSignup}
            disabled={!canSubmit}
            style={[styles.loginBtn, !canSubmit ? styles.loginBtnDisabled : null]}
            accessibilityRole="button"
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.loginBtnText}>Εγγραφή</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={goLogin} style={styles.linkBtn} accessibilityRole="button">
          <Text style={styles.linkText}>Έχεις ήδη λογαριασμό; Σύνδεση</Text>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#131212ff" },
  headcont: { flex: 1 },
  container: { flex: 4, justifyContent: "center", padding: 18 },
  card: {
    backgroundColor: "#080808ff",
    borderRadius: 18,
    padding: 18,
  },
  appheader: {
    backgroundColor: "#131212ff",
    paddingVertical: 40,
    alignItems: "center",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: 10,
  },
  appTitle: {
    color: "white",
    fontSize: 35,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: "700", color: "white" },
  subtitle: { color: "#b9c3e6", marginTop: 6, marginBottom: 16 },
  label: { color: "#cfe0ff", marginBottom: 6 },
  input: {
    backgroundColor: "#eaecf1ff",
    borderWidth: 1,
    borderColor: "#22335c",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111", // ✅ να φαίνεται πάνω σε ανοιχτό background
  },
  inputError: { borderColor: "#ff6b6b" },
  helperError: { color: "#ff8c8c", marginTop: 6 },
  passRow: { flexDirection: "row", alignItems: "center" },
  passInput: { flex: 1, marginRight: 10 },
  showBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1b2b52",
  },
  showBtnText: { color: "white", fontWeight: "600" },
  loginBtn: {
    marginTop: 16,
    backgroundColor: "#4f7cff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
  linkBtn: { marginTop: 10, alignItems: "center" },
  linkText: { color: "#fdfdfdff", fontWeight: "600" },

  tokenBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  tokenTitle: { color: "white", fontWeight: "700", marginBottom: 6 },
  tokenText: { color: "white", fontSize: 12 },
});
