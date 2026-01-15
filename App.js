import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  SafeAreaView,
  ScrollView,
  Image,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { NativeModules} from "react-native";

// Παίρνει το host (IP) από το Metro bundle URL (π.χ. http://192.168.1.8:8081/...)
function getMetroHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  // π.χ. "http://192.168.1.8:8081/index.bundle?platform=ios&dev=true..."
  if (!scriptURL) return null;

  const match = scriptURL.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
  return match?.[1] ?? null;
}

function getApiBaseUrl() {
  // Production (αν ποτέ κάνεις build): βάλε env
  if (!__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
  }

  // Dev: host = ίδιο μηχάνημα που τρέχει το Expo (Metro)
  let host = getMetroHost();

  // Android emulator special-case
  if (Platform.OS === "android" && (host === "localhost" || host === "127.0.0.1")) {
    host = "10.0.2.2";
  }

  // τελευταίο fallback
  if (!host) host = Platform.OS === "android" ? "10.0.2.2" : "localhost";

  return `http://${host}:8000`;
}

import Constants from "expo-constants";


function getHost() {
  // Expo SDK 49/50+ συνήθως εδώ
  const hostFromExpo =
      Constants.expoConfig?.hostUri?.split(":")[0] ||
      Constants.manifest2?.extra?.expoClient?.hostUri?.split(":")[0] ||
      Constants.manifest?.debuggerHost?.split(":")[0];

  if (hostFromExpo) return hostFromExpo;

  // fallback για android emulator
  if (Platform.OS === "android") return "10.0.2.2";

  return "localhost";
}

export const API_BASE = `http://${getHost()}:8000`;

console.log("API_BASE_URL =", API_BASE)
/* ==========================
   ✅ Βάλε σωστό base URL για το API σου
   ========================== */



// Αν τρέχεις από ΚΙΝΗΤΟ σε ίδιο Wi-Fi, βάλε την IP του PC σου:
// const API_BASE = "http://192.168.X.X:8000";

const TEAM_MEMBERS = [
  { name: "Χατζηερασης Φίλιππος Σάββας", inf: "inf2022230", am: "AM1" },
  { name: "Ευαγγελος Τσονγκας", inf: "if2021240", am: "AM2" },
];


async function apiRequest(path, options = {}, accessToken = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // ignore
  }

  if (!res.ok) {
    const msg =
        data?.detail || data?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

/* ==========================
   AUTH SCREENS
   ========================== */

function LoginScreen({ onLoginSuccess, goToSignup }) {
  const [email, setEmail] = useState("user@test.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLoginSuccess(data.accessToken, data.refreshToken);
    } catch (e) {
      Alert.alert("Σφάλμα", e.message || "Login απέτυχε");
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.authContainer}>
        <Text style={styles.appTitle}>Ask Ioannina</Text>
        <Text style={styles.authSubtitle}>Σύνδεση</Text>

        <View style={styles.formBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput
              style={styles.input}
              placeholder="π.χ. user@test.com"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
          />

          <Text style={styles.label}>Κωδικός</Text>
          <TextInput
              style={styles.input}
              placeholder="******"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
          />

          <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={loading}
          >
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Text style={styles.primaryBtnText}>Σύνδεση</Text>
            )}
          </TouchableOpacity>

          <View style={styles.teamBox}>
            <Text style={styles.teamTitle}>Ομάδα</Text>
            {TEAM_MEMBERS.map((m, i) => (
                <View key={i} style={styles.teamRow}>
                  <Text style={styles.teamName}>{m.name}</Text>
                  <Text style={styles.teamMeta}>
                    {m.inf} • {m.am}
                  </Text>
                </View>
            ))}
          </View>

          <TouchableOpacity onPress={goToSignup} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>
              Δεν έχετε λογαριασμό; Φτιάξτε έναν
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

function SignupScreen({ onSignupSuccess, goToLogin }) {
  const [email, setEmail] = useState("new@test.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSignupSuccess(data.accessToken, data.refreshToken);
    } catch (e) {
      Alert.alert("Signup απέτυχε", e.message || "Network request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
      <View style={styles.authContainer}>
        <Text style={styles.appTitle}>Ask Ioannina</Text>
        <Text style={styles.authSubtitle}>Δημιουργία λογαριασμού</Text>

        <View style={styles.formBox}>
          <Text style={styles.label}>Email</Text>
          <TextInput
              style={styles.input}
              placeholder="π.χ. my@email.com"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
          />

          <Text style={styles.label}>Κωδικός</Text>
          <TextInput
              style={styles.input}
              placeholder="τουλάχιστον 6 χαρακτήρες"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
          />

          <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSignup}
              disabled={loading}
          >
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToLogin} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>Έχεις ήδη λογαριασμό; Σύνδεση</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

/* ==========================
   HOME + MAP + LIST
   ========================== */

function HomeScreen({ accessToken, onLogout, goToCategory }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/pois/categories", {}, accessToken);
      setCats(data || []);
    } catch (e) {
      Alert.alert("Σφάλμα", e.message || "Αποτυχία φόρτωσης κατηγοριών");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Κατηγορίες</Text>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.headerBtn}>Logout</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
        ) : (
            <FlatList
                data={cats}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 14 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.catCard}
                        onPress={() => goToCategory(item)}
                    >
                      <View>
                        <Text style={styles.catName}>{item.name}</Text>
                        <Text style={styles.catCount}>{item.count} POIs</Text>
                      </View>
                      <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                )}
            />
        )}
      </SafeAreaView>
  );
}

function CategoryScreen({ accessToken, category, goBack, goToPoiDetails }) {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPois = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/pois/categories/${category.id}`, {}, accessToken);
      setPois(data || []);
    } catch (e) {
      Alert.alert("Σφάλμα", e.message || "Αποτυχία φόρτωσης POIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPois();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id]);

  const region = useMemo(() => {
    // Αν έχει δεδομένα, κέντρο στο πρώτο marker, αλλιώς Ioannina approx
    if (pois?.length > 0 && pois[0].lat && pois[0].lon) {
      return {
        latitude: pois[0].lat,
        longitude: pois[0].lon,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
      };
    }
    return {
      latitude: 39.665,
      longitude: 20.853,
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    };
  }, [pois]);

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.headerBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
        ) : (
            <View style={{ flex: 1 }}>
              <MapView style={{ flex: 1 }} initialRegion={region}>
                {pois.map((p) => (
                    <Marker
                        key={p.id}
                        coordinate={{ latitude: p.lat, longitude: p.lon }}
                        title={p.title}
                    >
                      <Callout
                          onPress={() => {
                            if (!p?.id) return;
                            goToPoiDetails(p.id);
                          }}
                      >
                        <View style={{ width: 180 }}>
                          <Text style={{ fontWeight: "700" }}>{p.title}</Text>
                          {!!p.description && (
                              <Text numberOfLines={2}>{p.description}</Text>
                          )}
                          <Text style={{ marginTop: 6, color: "#1a73e8" }}>
                            Tap για λεπτομέρειες
                          </Text>
                        </View>
                      </Callout>
                    </Marker>
                ))}
              </MapView>

              <View style={styles.bottomList}>
                <Text style={styles.bottomTitle}>Σημεία ενδιαφέροντος</Text>
                <FlatList
                    data={pois}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.poiRow}
                            onPress={() => goToPoiDetails(item.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.poiRowTitle}>{item.title}</Text>
                            {!!item.description && (
                                <Text style={styles.poiRowSub} numberOfLines={1}>
                                  {item.description}
                                </Text>
                            )}
                          </View>
                          <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>
                    )}
                />
              </View>
            </View>
        )}
      </SafeAreaView>
  );
}

function PoiDetailsScreen({ accessToken, poiId, goBack }) {
  const [poi, setPoi] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/pois/${poiId}`, {}, accessToken);
      setPoi(data);
    } catch (e) {
      Alert.alert("Σφάλμα", e.message || "Internal Server Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poiId]);
  const images = useMemo(() => {
    const list = [];
    if (poi?.image) list.push(poi.image);
    if (Array.isArray(poi?.images)) list.push(...poi.images);
    return Array.from(new Set(list)).slice(0, 6);
  }, [poi]);

  if (loading) {
    return (
        <SafeAreaView style={styles.screen}>
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.slider}>
              {(images.length >= 3 ? images : [...images, ...images, ...images].slice(0, 3)).map((u, idx) => (
                  <Image key={idx} source={{ uri: u }} style={styles.slideImg} />
              ))}
            </ScrollView>
            <View style={styles.header}>
              <TouchableOpacity onPress={goBack}>
                <Text style={styles.headerBtn}>‹ Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Λεπτομέρειες POI</Text>
              <View style={{ width: 60 }} />
            </View>

            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          </ScrollView>
        </SafeAreaView>
    );
  }

  if (!poi) {
    return (
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack}>
              <Text style={styles.headerBtn}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Λεπτομέρειες POI</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.center}>
            <Text>Δεν βρέθηκαν δεδομένα.</Text>
          </View>
        </SafeAreaView>
    );
  }

  const openWikipedia = async () => {
    if (!poi.wikipediaUrl) return;
    try {
      await Linking.openURL(poi.wikipediaUrl);
    } catch (e) {
      Alert.alert("Σφάλμα", "Δεν μπορώ να ανοίξω το link");
    }
  };

  return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.headerBtn}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Λεπτομέρειες POI</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Images (show first as big) */}
          {poi.images?.length > 0 && (
              <View>
                <Image source={{ uri: poi.images[0] }} style={styles.heroImage} />
              </View>
          )}

          <View style={{ padding: 16 }}>
            {!!poi.categoryName && (
                <Text style={styles.tag}>{poi.categoryName}</Text>
            )}

            <Text style={styles.poiTitle}>{poi.title || poi.id}</Text>

            {/* ✅ εδώ η αλλαγή: shortDescription -> fallback description */}
            {!!(poi.shortDescription || poi.description) && (
                <Text style={styles.poiDesc}>
                  {poi.shortDescription || poi.description}
                </Text>
            )}

            {(poi.lat && poi.lon) && (
                <Text style={styles.coords}>
                  Συντεταγμένες: {poi.lat}, {poi.lon}
                </Text>
            )}

            <TouchableOpacity
                style={[styles.wikiBtn, !poi.wikipediaUrl && { opacity: 0.45 }]}
                onPress={openWikipedia}
                disabled={!poi.wikipediaUrl}
            >
              <Text style={styles.wikiText}>Άνοιγμα στη Wikipedia</Text>
            </TouchableOpacity>

            {/* Extra images strip */}
            {poi.images?.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {poi.images.slice(1).map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.thumb} />
                  ))}
                </ScrollView>
            )}

            {/* Περισσότερα */}
            {(poi.facts?.length > 0 || poi.extraText) && (
                <View style={styles.longBox}>
                  <Text style={styles.longTitle}>Περισσότερα</Text>

                  {poi.facts?.length > 0 ? (
                      poi.facts.map((f, index) => (
                          <Text key={index} style={styles.longText}>
                            {f.label}: {f.value}
                          </Text>
                      ))
                  ) : (
                      <Text style={styles.longText}>{poi.extraText}</Text>
                  )}
                </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

/* ==========================
   ROOT APP
   ========================== */

export default function App() {
  const [screen, setScreen] = useState("login"); // login | signup | home | category | poi
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPoiId, setSelectedPoiId] = useState(null);

  const onLoginSuccess = (access, refresh) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    setScreen("home");
  };

  const onLogout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setSelectedCategory(null);
    setSelectedPoiId(null);
    setScreen("login");
  };

  const goToSignup = () => setScreen("signup");
  const goToLogin = () => setScreen("login");

  const goToCategory = (cat) => {
    setSelectedCategory(cat);
    setScreen("category");
  };

  const goBackFromCategory = () => {
    setSelectedCategory(null);
    setScreen("home");
  };

  const goToPoiDetails = (poiId) => {
    setSelectedPoiId(poiId);
    setScreen("poi");
  };

  const goBackFromPoi = () => {
    setSelectedPoiId(null);
    setScreen("category");
  };

  return (
      <View style={{ flex: 1, backgroundColor: "#0b1726" }}>
        <StatusBar barStyle="light-content" />
        {screen === "login" && (
            <LoginScreen onLoginSuccess={onLoginSuccess} goToSignup={goToSignup} />
        )}
        {screen === "signup" && (
            <SignupScreen onSignupSuccess={onLoginSuccess} goToLogin={goToLogin} />
        )}
        {screen === "home" && (
            <HomeScreen
                accessToken={accessToken}
                onLogout={onLogout}
                goToCategory={goToCategory}
            />
        )}
        {screen === "category" && selectedCategory && (
            <CategoryScreen
                accessToken={accessToken}
                category={selectedCategory}
                goBack={goBackFromCategory}
                goToPoiDetails={goToPoiDetails}
            />
        )}
        {screen === "poi" && selectedPoiId && (
            <PoiDetailsScreen
                accessToken={accessToken}
                poiId={selectedPoiId}
                goBack={goBackFromPoi}
            />
        )}
      </View>
  );
}

/* ==========================
   STYLES
   ========================== */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b1726" },

  header: {
    paddingTop: Platform.OS === "android"
        ? Math.max((StatusBar.currentHeight || 24) - 6, 0)
        : 0,
    height: 56 + (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0),
    backgroundColor: "#0f233d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  headerBtn: { color: "white", fontSize: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Auth
  authContainer: {
    flex: 1,
    backgroundColor: "#0b1726",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  appTitle: { color: "white", fontSize: 34, fontWeight: "800", marginBottom: 8 },
  authSubtitle: { color: "white", fontSize: 18, opacity: 0.75, marginBottom: 18 },
  formBox: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 16,
    borderRadius: 14,
  },
  label: { color: "white", opacity: 0.8, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    color: "white",
    padding: 12,
    borderRadius: 10,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#1f5cff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "800", fontSize: 16 },
  linkText: { color: "#9cc4ff", textAlign: "center" },

  // Category list
  catCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catName: { color: "white", fontSize: 18, fontWeight: "800" },
  catCount: { color: "white", opacity: 0.7, marginTop: 4 },
  arrow: { color: "white", fontSize: 28, opacity: 0.7 },

  // Bottom list over map
  bottomList: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: 280,
    backgroundColor: "rgba(11, 23, 38, 0.95)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
  },
  bottomTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  poiRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  poiRowTitle: { color: "white", fontWeight: "800" },
  poiRowSub: { color: "white", opacity: 0.65, marginTop: 2 },

  // POI details
  heroImage: { width: "100%", height: 260, backgroundColor: "#000" },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#0f2b55",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
    fontWeight: "700",
  },
  poiTitle: { color: "white", fontSize: 30, fontWeight: "900" },
  poiDesc: { color: "white", opacity: 0.85, marginTop: 8, fontSize: 16, lineHeight: 22 },
  coords: { color: "white", opacity: 0.85, marginTop: 8, fontWeight: "700" },

  wikiBtn: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  wikiText: { color: "white", fontWeight: "800" },

  thumb: {
    width: 120,
    height: 80,
    borderRadius: 12,
    marginRight: 10,
    marginTop: 14,
    backgroundColor: "#000",
  },

  longBox: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
  },
  longTitle: { color: "white", fontWeight: "900", fontSize: 18, marginBottom: 6 },
  longText: { color: "white", opacity: 0.85, fontSize: 15, lineHeight: 20 },
});
