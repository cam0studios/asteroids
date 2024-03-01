// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzeCkDUfEYPXUC02C9B13Q99MjvpPMlEs",
  authDomain: "asteroids-games.firebaseapp.com",
  projectId: "asteroids-games",
  storageBucket: "asteroids-games.appspot.com",
  messagingSenderId: "960580718864",
  appId: "1:960580718864:web:385eed0fd12e5f1afa1595",
  measurementId: "G-9T5F2J6T5D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const TAG_ID = firebaseConfig.measurementId;
window.log = (name, data) => {
  logEvent(analytics, name, data);
}
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());

gtag("config",TAG_ID);
if (!localStorage.getItem("userId")) {
  localStorage.setItem("userId",Date.now().toString()+Math.round(Math.random()*10000));
}
gtag("config",TAG_ID,{"user_id":localStorage.getItem("userId")});