// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCg7vGE2Evt8iplqJEsA3HEaO1YmqHkZGU",
  authDomain: "showme-708f9.firebaseapp.com",
  projectId: "showme-708f9",
  storageBucket: "showme-708f9.firebasestorage.app",
  messagingSenderId: "485292217670",
  appId: "1:485292217670:web:94c1a90f8d159a67c4c147",
  measurementId: "G-T2HZKT8DZN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);