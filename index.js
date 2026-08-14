import "expo";
import "@expo/metro-runtime";

import { withErrorOverlay } from "@expo/metro-runtime/error-overlay";
import { App } from "expo-router/build/qualified-entry";
import { AppRegistry, Platform } from "react-native";

const RootComponent = __DEV__ ? withErrorOverlay(App) : App;

AppRegistry.registerComponent("main", () => RootComponent);

if (Platform.OS === "web" && typeof window !== "undefined") {
  AppRegistry.runApplication("main", {
    rootTag: document.getElementById("root"),
    hydrate: globalThis.__EXPO_ROUTER_HYDRATE__,
  });
}
