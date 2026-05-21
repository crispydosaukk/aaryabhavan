// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // Import Firebase Storage

const firebaseConfig = {
  apiKey: "AIzaSyD-2mlJKJNVLy-9t6B8Y1zCaVlquO7lZEo",
  authDomain: "abkitchen-bbb9c.firebaseapp.com",
  projectId: "abkitchen-bbb9c",
  storageBucket: "abkitchen-bbb9c.firebasestorage.app",
  messagingSenderId: "512812298134",
  appId: "1:512812298134:web:8134f315c90a041272b7b7",
  measurementId: "G-462PXF61EG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (for database)
const db = getFirestore(app);

// Initialize Firebase Auth (for authentication)
const auth = getAuth(app);

// Initialize Firebase Storage (for file storage)
const storage = getStorage(app); // Initialize storage

export { db, auth, storage }; // Export storage along with db and auth
