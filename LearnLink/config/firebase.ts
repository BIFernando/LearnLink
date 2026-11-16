import AsyncStorage from "@react-native-async-storage/async-storage";
// Firebase 12.18.0's shared types omit this React Native runtime export.
// @ts-expect-error React Native export is missing from Firebase's shared declarations.
import { getReactNativePersistence, initializeAuth } from "firebase/auth";

import {
  app,
  connectFirebaseEmulators,
  db,
  defaultFunctions,
  functions,
  storage,
} from "./firebase.shared";

export { app, db, defaultFunctions, functions, storage };

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

connectFirebaseEmulators(auth);

