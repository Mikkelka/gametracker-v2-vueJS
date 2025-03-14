// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCwhl7yMQwHA4cljXmvE_Ffk0fYzKG5aCo",
  authDomain: "gametracker-app-1041e.firebaseapp.com",
  projectId: "gametracker-app-1041e",
  storageBucket: "gametracker-app-1041e.appspot.com",
  messagingSenderId: "954041370264",
  appId: "1:954041370264:web:c6c64b4cbb31a9849532ed",
};

function initializeFirebase() {
  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    window.auth = firebase.auth();
  } else {
    console.error("Firebase SDK is not loaded");
  }
}

initializeFirebase();
