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

gtag("config", TAG_ID, { "user_id": localStorage.getItem("user") });

//firebase online leaderboards
window.submitScore = async function (username, time, score, version) {
  if (location.href.includes('cam0studios')) { //if not on testing
    let fullPlayerScore = Object.values(player.score).reduce((a, b) => a + b, 0);
    if (fullPlayerScore > 10000 && fullPlayerScore < 100000000) {
      addDoc(collection(db, "highscores2"), {
        scoreData: score,
        time,
        username: username.substring(0, 25),
        total: Object.values(player.score).reduce((a, b) => a + b, 0),
        timestamp: serverTimestamp(),
        version: version,
        stats: player.stats
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

//firebase user stuff
window.userSignIn = function () {
  async function waitForVex(props) {
    return new Promise((res, rej) => {
      if ("callback" in props) props.callback = () => { props.callback(...arguments); res(...arguments) };
      else props.callback = res;
      vex.dialog.prompt(props);
      if (props.password) setTimeout(() => { document.getElementsByClassName("vex-dialog-prompt-input")[0].setAttribute("type", "password") }, 500);
    });
  }

  async function chooseUsername(message) {
    let username = await waitForVex({
      message: message,
      placeholder: "Spaceman"
    });

    if (username == "" || username.length > 20) return createUsername("Choose a valid username (less than 20 digits)");
    if ((await getDoc(doc(db, "users", username))).exists()) return signIn(username, "Password");
    else return createPassword(username);
  }
  async function createPassword(username) {
    let password = await waitForVex({
      message: "Create a password",
      password: true
    });

    let passwordHash = sha1(password);
    await setDoc(doc(db, "users", username), { password: passwordHash, bulletsFired: 0, bulletsHit: 0, chests: 0, kills: 0, pickups: 0, timePlayed: 0, upgrades: 0 });

    return { username, password: passwordHash };
  }
  async function signIn(username, message) {
    let password = await waitForVex({
      message: message,
      password: true
    });

    let passwordHash = sha1(password);
    if ((await getDoc(doc(db, "users", username))).data().password == passwordHash) {
      console.log("success");
      return { username, password: passwordHash };
    } else {
      return signIn(username, "Incorrect password");
    }
  }

  return new Promise((res, rej) => {
    chooseUsername("Choose a username").then(e => {
      localStorage.setItem("user", e.username);
      localStorage.setItem("signedIn", "true");
      pause = false;
      if (!started) setupVars();
      res();
    });
  });
}

window.userSignOut = function () {
  localStorage.setItem("user", "");
  localStorage.setItem("signedIn", "");
}

window.setUser = async function (props, data) {
  let relative = Object.hasOwn(props, "relative") ? props.relative : true;
  let username = Object.hasOwn(props, "username") ? props.username : localStorage.getItem("user");
  console.log(username);

  if (typeof data != "object") {
    data = {
      /*bulletsHit: 0,
      bulletsFired: 0,
      chests: 0,
      kills: 0,
      pickups: 0,
      runs: 0,
      timePlayed: 0*/
    }
  } else {
    let oldData = await getUser(username);

    if (relative) {
      Object.keys(data).forEach((e) => {
        if (!isNaN(parseFloat(oldData?.[e]))) data[e] += oldData[e];
      });
    }

    Object.keys(oldData).forEach((e) => {
      if (!Object.hasOwn(data, e)) data[e] = oldData[e];
    });
  }

  let docRef = doc(db, "users", username);
  setDoc(docRef, data);
  return data;
}

window.getUser = async function (username = localStorage.getItem("user")) {
  let snap = await getDoc(doc(db, "users", username));
  if (snap.exists()) {
    return snap.data();
  } else {
    return setUser({ username, relative: false });
  }
}


if (localStorage.getItem("userId")) {
  console.log("old user");
  localStorage.clear();
}
if (!localStorage.getItem("user")) {
  console.log("no user");
  localStorage.setItem("signedIn", "");
}

//analytics
//window.log = (name, data) => {
//  logEvent(analytics, name, data);
//}
