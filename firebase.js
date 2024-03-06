// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, getDocs, where, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"
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
const db = getFirestore(app);
const TAG_ID = firebaseConfig.measurementId;

//gtag stuff
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag("js", new Date());

gtag("config", TAG_ID);
if (!localStorage.getItem("userId")) {
  localStorage.setItem("userId", Date.now().toString() + Math.round(Math.random() * 10000));
}

gtag("config", TAG_ID, { "user_id": localStorage.getItem("userId") });

//firebase online leaderboards
window.submitScore = async function(username, time, score) {
  if (fullPlayerScore > 1000 && fullPlayerScore < 100000000) {
    addDoc(collection(db, "highscores"), {
      scoreData: score,
      time,
      username,
      total: Object.values(player.score).reduce((a, b) => a + b, 0),
      timestamp: serverTimestamp()
    })
}
}
window.getScores = async function(scoreOffset) {
  const querySnapshot = await getDocs(query(collection(db, "highscores"), orderBy("total", "desc"), limit(10)))
  return querySnapshot
}


//window.log = (name, data) => {
//  logEvent(analytics, name, data);
//}