
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
// Firebase 12.18.0's shared types omit this React Native runtime export.
// @ts-expect-error React Native export is missing from Firebase's shared declarations.
import { connectAuthEmulator, getReactNativePersistence, initializeAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
} from "firebase/functions";
import {
  connectStorageEmulator,
  getStorage,
} from "firebase/storage";

function requireFirebaseEnv(name: string, value: string | undefined): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(
      `Missing ${name}. Add it to the Expo app's .env file before starting the app.`,
    );
  }

  return normalizedValue;
}

const firebaseConfig = {
  apiKey: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: requireFirebaseEnv(
    "EXPO_PUBLIC_FIREBASE_APP_ID",
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ),
};

export const app =
  getApps().find((existingApp) => existingApp.name === "[DEFAULT]") ??
  initializeApp(firebaseConfig);


export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-south1");
export const defaultFunctions = getFunctions(app);
export const storage = getStorage(app);

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
