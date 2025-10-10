import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ Import storage

const firebaseConfig = {
  apiKey: "AIzaSyCP49WCLoBa5HIpXMkES7ce8BLhxyXov-o",
  authDomain: "management-system-9eab0.firebaseapp.com",
  projectId: "management-system-9eab0",
  storageBucket: "management-system-9eab0.appspot.com", // ✅ fixed domain
  messagingSenderId: "115080749841",
  appId: "1:115080749841:web:85b2314e8ae97dfa3f62b0",
  measurementId: "G-VNYKPCFB2D",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ✅ Export storage
