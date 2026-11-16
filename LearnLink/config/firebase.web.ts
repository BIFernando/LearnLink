import { getAuth } from "firebase/auth";

import { app, connectFirebaseEmulators } from "./firebase.shared";

export { app, db, defaultFunctions, functions, storage } from "./firebase.shared";

export const auth = getAuth(app);

connectFirebaseEmulators(auth);
