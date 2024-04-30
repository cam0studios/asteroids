// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, doc, getDocs, where, query, orderBy, limit, serverTimestamp, startAfter, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"
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
window.submitScore = async function (username, time, score, version) {
  if (location.href.includes('cam0studios')) {
    let fullPlayerScore = Object.values(player.score).reduce((a, b) => a + b, 0);
    if (fullPlayerScore > 10000 && fullPlayerScore < 100000000) {
      addDoc(collection(db, "highscores2"), {
        scoreData: score,
        time,
        username: username.substring(0, 25),
        total: Object.values(player.score).reduce((a, b) => a + b, 0),
        timestamp: serverTimestamp(),
        version: version,
        stats: player.stats,
        userId: localStorage.getItem("userId")
      })
    }
  }
}
window.getScores = async function (startAtObject) {
  const collectionName = "highscores2",
    itemLimit = 10
  let querySnapshot;
  if (typeof startAtObject !== "undefined") {
    querySnapshot = await getDocs(query(collection(db, collectionName), orderBy("total", "desc"), limit(itemLimit), startAfter(startAtObject)))
  } else {
    querySnapshot = await getDocs(query(collection(db, collectionName), orderBy("total", "desc"), limit(itemLimit)))
  }
  return querySnapshot
}

window.getUser = async function (id = localStorage.getItem("userId")) {
  let docRef = doc(db, "users", id);
  let snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  } else {
    setUser({ id: id, relative: false });
  }
}
window.setUser = async function (props, data) {
  let relative = Object.hasOwn(props, "relative") ? props.relative : true;
  let id = Object.hasOwn(props, "id") ? props.id : localStorage.getItem("userId");
  if (typeof data != "object") {
    data = {
      username: "",
      bulletsHit: 0,
      bulletsFired: 0,
      chests: 0,
      kills: 0,
      pickups: 0,
      runs: 0,
      username: localStorage.getItem("username")
    }
  } else {
    let oldData = await getUser(id);
    if (relative) {
      Object.keys(data).forEach((e) => {
        if (parseFloat(oldData[e])) data[e] += oldData[e];
      });
    }
    Object.keys(oldData).forEach((e) => {
      if (!Object.hasOwn(data, e)) data[e] = oldData[e];
    });
  }
  let docRef = doc(db, "users", id);
  setDoc(docRef, data);
}

//analytics
//window.log = (name, data) => {
//  logEvent(analytics, name, data);
//}
