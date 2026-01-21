import React, { useEffect, useMemo, useState } from "react";
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
  FlatList,
  ScrollView,
  Image,
  SafeAreaView,
  Linking,
  Dimensions,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import Constants from "expo-constants";

/** -----------------------------
 *  API BASE URL (auto IP via Expo host)
 *  ----------------------------- */
function getHost() {
  const hostFromExpo =
    Constants.expoConfig?.hostUri?.split(":")[0] ||
    Constants.manifest2?.extra?.expoClient?.hostUri?.split(":")[0] ||
    Constants.manifest?.debuggerHost?.split(":")[0];

  if (hostFromExpo) return hostFromExpo;

  // Android emulator special case
  if (Platform.OS === "android") return "10.0.2.2";

  return "localhost";
}

export const API_BASE_URL = `http://${getHost()}:8000`;
console.log("API_BASE_URL =", API_BASE_URL);

const SCREEN_W = Dimensions.get("window").width;

/** -----------------------------
 *  Small API helper w/ refresh
 *  ----------------------------- */
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
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

function useApi() {
  const [tokens, setTokens] = useState(null); // {accessToken, refreshToken}

  const authedFetch = async (path, { method = "GET", body, headers = {} } = {}) => {
    const doReq = async (accessToken) => {
      const h = {
        "Content-Type": "application/json",
        ...headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };
      return fetchJson(`${API_BASE_URL}${path}`, {
        method,
        headers: h,
        body: body ? JSON.stringify(body) : undefined,
      });
    };

    try {
      return await doReq(tokens?.accessToken);
    } catch (e) {
      // auto refresh on 401
      if (e.status === 401 && tokens?.refreshToken) {
        const refreshed = await fetchJson(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        setTokens(refreshed);
        return await doReq(refreshed.accessToken);
      }
      throw e;
    }
  };

  return { tokens, setTokens, authedFetch };
}

/** -----------------------------
 *  App Screens (no navigation lib)
 *  ----------------------------- */
export default function App() {
  const { setTokens, authedFetch } = useApi();

  // "screens": login → signup → categories → categoryMap → poiDetails
  const [route, setRoute] = useState({ name: "login", params: {} });

  const go = (name, params = {}) => setRoute({ name, params });
  const logout = () => {
    setTokens(null);
    go("login");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b1523" }}>
      {route.name === "login" && (
        <LoginScreen
          onLogin={(t) => {
            setTokens(t);
            go("categories");
          }}
          goSignup={() => go("signup")}
        />
      )}

      {route.name === "signup" && (
        <SignupScreen
          onSignup={() => {
            Alert.alert("Έτοιμο!", "Ο λογαριασμός δημιουργήθηκε. Κάνε σύνδεση.");
            go("login");
          }}
          goLogin={() => go("login")}
        />
      )}

      {route.name === "categories" && (
        <CategoriesScreen
          authedFetch={authedFetch}
          onOpenCategory={(category) => go("categoryMap", { category })}
          onLogout={logout}
        />
      )}

      {route.name === "categoryMap" && (
        <CategoryMapScreen
          authedFetch={authedFetch}
          category={route.params?.category}
          onBack={() => go("categories")}
          // ✅ IMPORTANT: pass category to poiDetails so Back works reliably
          onOpenPoi={(poi) =>
            go("poiDetails", {
              poiId: poi?.id,
              category: route.params?.category,
            })
          }
        />
      )}

      {route.name === "poiDetails" && (
        <PoiDetailsScreen
          authedFetch={authedFetch}
          poiId={route.params?.poiId}
          // ✅ IMPORTANT: go back to categoryMap with category (not route.params as-is)
          onBack={() => go("categoryMap", { category: route.params?.category })}
        />
      )}
    </SafeAreaView>
  );
}

/** -----------------------------
 *  LOGIN
 *  ----------------------------- */
function LoginScreen({ onLogin, goSignup }) {
  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  // show /about (optional but recommended in the assignment)
  const [about, setAbout] = useState([]);
  useEffect(() => {
    fetchJson(`${API_BASE_URL}/about`)
      .then(setAbout)
      .catch(() => {});
  }, []);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => password.length >= 6, [password]);

  const doLogin = async () => {
    try {
      setLoading(true);
      const data = await fetchJson(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onLogin(data);
    } catch (e) {
      Alert.alert("Login απέτυχε", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("./assets/splash-icon.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centerWrap}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Ioannina Explorer</Text>
          <Text style={styles.subtitle}>Σύνδεση</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, (!emailOk || !passOk || loading) && styles.btnDisabled]}
            disabled={!emailOk || !passOk || loading}
            onPress={doLogin}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={goSignup}>
            <Text style={styles.linkText}>Δεν έχεις λογαριασμό; Φτιάξε έναν</Text>
          </TouchableOpacity>

          {about?.length > 0 && (
            <View style={styles.aboutBox}>
              <Text style={styles.aboutTitle}>Ομάδα</Text>
              {about.map((m, idx) => (
                <Text key={idx} style={styles.aboutLine}>
                  • {m.name} ({m.am})
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.hint}>
            Tip: Το API_BASE_URL γίνεται αυτόματα από Expo host (χωρίς hardcoded IP).
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

/** -----------------------------
 *  SIGNUP
 *  ----------------------------- */
function SignupScreen({ onSignup, goLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  const emailOk = useMemo(() => /^\S+@\S+\.\S+$/.test(email.trim()), [email]);
  const passOk = useMemo(() => password.length >= 6, [password]);
  const matchOk = useMemo(() => password2.length > 0 && password2 === password, [password2, password]);

  const doSignup = async () => {
    try {
      setLoading(true);
      await fetchJson(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onSignup();
    } catch (e) {
      Alert.alert("Signup απέτυχε", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("./assets/splash-icon.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centerWrap}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Ioannina Explorer</Text>
          <Text style={styles.subtitle}>Δημιουργία λογαριασμού</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6)"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, (!emailOk || !passOk || !matchOk || loading) && styles.btnDisabled]}
            disabled={!emailOk || !passOk || !matchOk || loading}
            onPress={doSignup}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={goLogin}>
            <Text style={styles.linkText}>Έχεις ήδη λογαριασμό; Σύνδεση</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

/** -----------------------------
 *  CATEGORIES SCREEN (/pois/categories)
 *  ----------------------------- */
function CategoriesScreen({ authedFetch, onOpenCategory, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await authedFetch("/pois/categories");
        const clean = (data || []).filter((c) => c && c.id);
        if (mounted) setCats(clean);
      } catch (e) {
        Alert.alert("Σφάλμα", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [authedFetch]);

  return (
    <View style={styles.screen}>
      <Header title="Κατηγορίες POIs (Ιωάννινα)" rightText="Logout" onRightPress={onLogout} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: "white" }}>Φόρτωση...</Text>
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.catCard} onPress={() => onOpenCategory(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catTitle}>{item.name}</Text>
                <Text style={styles.catSub}>{item.count} σημεία ενδιαφέροντος</Text>
              </View>
              <Text style={styles.catArrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

/** -----------------------------
 *  CATEGORY MAP SCREEN (/pois/categories/{id})
 *  ----------------------------- */
function CategoryMapScreen({ authedFetch, category, onBack, onOpenPoi }) {
  // ✅ guard: if category missing, show message instead of crashing
  if (!category?.id) {
    return (
      <View style={styles.screen}>
        <Header title="Κατηγορία" leftText="‹ Back" onLeftPress={onBack} />
        <View style={styles.center}>
          <Text style={{ color: "white" }}>Δεν βρέθηκε κατηγορία. Γύρνα πίσω.</Text>
        </View>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [pois, setPois] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await authedFetch(`/pois/categories/${category.id}`);
        const clean = (data || []).filter((p) => p && p.id);
        if (mounted) setPois(clean);
      } catch (e) {
        Alert.alert("Σφάλμα", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [authedFetch, category.id]);

  const region = useMemo(() => {
    const withCoords = (pois || []).filter(
      (p) => typeof p.lat === "number" && typeof p.lon === "number"
    );
    if (withCoords.length === 0) {
      // Ioannina center fallback
      return { latitude: 39.665, longitude: 20.853, latitudeDelta: 0.18, longitudeDelta: 0.18 };
    }
    const lats = withCoords.map((p) => p.lat);
    const lons = withCoords.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLon + maxLon) / 2;
    const latitudeDelta = Math.max(0.05, (maxLat - minLat) * 1.6);
    const longitudeDelta = Math.max(0.05, (maxLon - minLon) * 1.6);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [pois]);

  return (
    <View style={styles.screen}>
      <Header title={category?.name || "Κατηγορία"} leftText="‹ Back" onLeftPress={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: "white" }}>Φόρτωση POIs...</Text>
        </View>
      ) : (
        <MapView style={{ flex: 1 }} initialRegion={region}>
          {(pois || [])
            .filter((p) => p?.id && typeof p.lat === "number" && typeof p.lon === "number")
            .map((p) => (
              <Marker key={String(p.id)} coordinate={{ latitude: p.lat, longitude: p.lon }}>
                <Callout onPress={() => onOpenPoi(p)}>
                  <View style={{ width: 220 }}>
                    <Text style={{ fontWeight: "800", marginBottom: 4 }}>{p.title || p.id}</Text>
                    {p.description ? (
                      <Text numberOfLines={3} style={{ color: "#333" }}>
                        {p.description}
                      </Text>
                    ) : null}
                    <Text style={{ marginTop: 8, color: "#1d4ed8", fontWeight: "700" }}>
                      Άνοιγμα λεπτομερειών →
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
        </MapView>
      )}
    </View>
  );
}

/** -----------------------------
 *  POI DETAILS SCREEN (/pois/{id})
 *  ----------------------------- */
function PoiDetailsScreen({ authedFetch, poiId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [poi, setPoi] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await authedFetch(`/pois/${poiId}`);
        if (mounted) setPoi(data);
      } catch (e) {
        Alert.alert("Σφάλμα", e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [authedFetch, poiId]);

  const images = useMemo(() => {
    const list = [];
    if (poi?.image) list.push(poi.image);
    if (Array.isArray(poi?.images)) list.push(...poi.images);
    return Array.from(new Set(list)).slice(0, 6);
  }, [poi]);

  const openWikipedia = async () => {
    if (!poi?.wikipediaUrl) return;
    const ok = await Linking.canOpenURL(poi.wikipediaUrl);
    if (ok) Linking.openURL(poi.wikipediaUrl);
  };

  return (
    <View style={styles.screen}>
      <Header title="Λεπτομέρειες POI" leftText="‹ Back" onLeftPress={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: "white" }}>Φόρτωση...</Text>
        </View>
      ) : !poi ? (
        <View style={styles.center}>
          <Text style={{ color: "white" }}>Δεν βρέθηκε POI.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.slider}>
            {(images.length >= 3 ? images : [...images, ...images, ...images].slice(0, 3)).map((u, idx) => (
              <Image key={idx} source={{ uri: u }} style={styles.slideImg} />
            ))}
          </ScrollView>

          <View style={{ padding: 16 }}>
            {!!poi.categoryName && <Text style={styles.tag}>{poi.categoryName}</Text>}
            <Text style={styles.poiTitle}>{poi.title || poi.id}</Text>
            {!!poi.description && <Text style={styles.poiDesc}>{poi.description}</Text>}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Συντεταγμένες:</Text>
              <Text style={styles.metaVal}>
                {typeof poi.lat === "number" && typeof poi.lon === "number"
                  ? `${poi.lat.toFixed(6)}, ${poi.lon.toFixed(6)}`
                  : "—"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.wikiBtn, !poi.wikipediaUrl && { opacity: 0.5 }]}
              disabled={!poi.wikipediaUrl}
              onPress={openWikipedia}
            >
              <Text style={styles.wikiText}>Άνοιγμα στη Wikipedia</Text>
            </TouchableOpacity>

            {!!poi.extraText && (
              <View style={styles.longBox}>
                <Text style={styles.longTitle}>Περισσότερα</Text>
                <Text style={styles.longText}>{poi.extraText}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/** -----------------------------
 *  Shared Header
 *  ----------------------------- */
function Header({ title, leftText, onLeftPress, rightText, onRightPress }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onLeftPress} disabled={!onLeftPress} style={styles.headerBtn}>
        <Text style={[styles.headerBtnText, !onLeftPress && { opacity: 0 }]}>{leftText || " "}</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity onPress={onRightPress} disabled={!onRightPress} style={styles.headerBtn}>
        <Text style={[styles.headerBtnText, !onRightPress && { opacity: 0 }]}>{rightText || " "}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** -----------------------------
 *  Styles
 *  ----------------------------- */
const styles = StyleSheet.create({
  bg: { flex: 1 },
  centerWrap: { flex: 1, justifyContent: "center", padding: 18 },
  card: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  title: { color: "white", fontSize: 26, fontWeight: "900", marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 16, marginBottom: 14 },

  input: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "white", fontSize: 16, fontWeight: "800" },
  linkBtn: { marginTop: 12, alignItems: "center" },
  linkText: { color: "white", fontWeight: "700" },

  aboutBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  aboutTitle: { color: "white", fontWeight: "900", marginBottom: 6 },
  aboutLine: { color: "white", opacity: 0.9 },

  hint: { marginTop: 12, color: "rgba(255,255,255,0.75)", fontSize: 12 },

  screen: { flex: 1, backgroundColor: "#0b1523" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 54,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f1d33",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerBtn: { width: 72, paddingVertical: 8 },
  headerBtnText: { color: "white", fontWeight: "800" },
  headerTitle: { flex: 1, textAlign: "center", color: "white", fontWeight: "900", fontSize: 15 },

  catCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  catTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  catSub: { color: "rgba(255,255,255,0.75)", marginTop: 4 },
  catArrow: { color: "white", fontSize: 26, paddingHorizontal: 8, opacity: 0.9 },

  slider: { width: "100%", height: 240, backgroundColor: "#000" },
  slideImg: { width: SCREEN_W, height: 240, resizeMode: "cover" },

  tag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(37,99,235,0.22)",
    borderColor: "rgba(37,99,235,0.65)",
    borderWidth: 1,
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "800",
    marginBottom: 10,
  },
  poiTitle: { color: "white", fontSize: 22, fontWeight: "900", marginBottom: 8 },
  poiDesc: { color: "rgba(255,255,255,0.82)", lineHeight: 20, marginBottom: 14 },

  metaRow: { flexDirection: "row", marginBottom: 10 },
  metaLabel: { color: "rgba(255,255,255,0.75)", width: 110 },
  metaVal: { color: "white", fontWeight: "800" },

  wikiBtn: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  wikiText: { color: "white", fontWeight: "900" },

  longBox: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 14,
  },
  longTitle: { color: "white", fontWeight: "900", marginBottom: 6 },
  longText: { color: "rgba(255,255,255,0.82)", lineHeight: 20 },
});
