import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyARzni3saxZeacFRvvNUI4VA8Oj5urTP1M",
  authDomain: "games-speedrun.firebaseapp.com",
  projectId: "games-speedrun",
  storageBucket: "games-speedrun.firebasestorage.app",
  messagingSenderId: "238065410893",
  appId: "1:238065410893:web:3399a13192960147cd8d04",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
