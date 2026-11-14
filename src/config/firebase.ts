import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 🔴 ඔයාගේ Firebase Console එකෙන් ගත්තු details මෙතන දාන්න
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",           // ඔයාගේ ඇත්ත apiKey
    authDomain: "YOUR_AUTH_DOMAIN",   // ඔයාගේ ඇත්ත authDomain
    projectId: "YOUR_PROJECT_ID",     // ඔයාගේ ඇත්ත projectId
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);