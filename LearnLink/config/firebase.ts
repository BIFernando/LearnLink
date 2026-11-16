import AsyncStorage from "@react-native-async-storage/async-storage";
// Firebase 12.18.0's shared types omit this React Native runtime export.
// @ts-expect-error React Native export is missing from Firebase's shared declarations.
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
<<<<<<< Updated upstream

import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

=======
>>>>>>> Stashed changes

import { app, connectFirebaseEmulators } from "./firebase.shared";

export { app, db, defaultFunctions, functions, storage } from "./firebase.shared";

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

<<<<<<< Updated upstream
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-south1");
export const storage = getStorage(app);
=======
connectFirebaseEmulators(auth);
>>>>>>> Stashed changes
