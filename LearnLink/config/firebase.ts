
import AsyncStorage from "@react-native-async-storage/async-storage";
// Firebase 12.18.0's shared types omit this React Native runtime export.
// @ts-expect-error React Native export is missing from Firebase's shared declarations.
import { connectAuthEmulator, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import { connectStorageEmulator } from "firebase/storage";
import {
  app,
  db,
  defaultFunctions,
  functions,
  storage,
  connectFirebaseEmulators,
} from "./firebase.shared";

export { app, db, defaultFunctions, functions, storage };

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

connectFirebaseEmulators(auth);

if (
  __DEV__ &&
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === "true"
) {
  const emulatorHost =
    process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST?.trim() || "127.0.0.1";

  connectAuthEmulator(auth, `http://${emulatorHost}:9099`);
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
  connectFunctionsEmulator(defaultFunctions, emulatorHost, 5001);
  connectStorageEmulator(storage, emulatorHost, 9199);
}

