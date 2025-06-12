// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsHjb5NLYNLwIL6AZWUxItRD3dnopIano",
  authDomain: "idedersprogramweb.firebaseapp.com",
  projectId: "idedersprogramweb",
  storageBucket: "idedersprogramweb.firebasestorage.app",
  messagingSenderId: "173092514337",
  appId: "1:173092514337:web:0c18d20362e177d3295160"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;