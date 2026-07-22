// Secured back-office logic.
//
// Security model: the true gate is Firestore Security Rules (read allowed only
// for OWNER_EMAIL, verified). This file adds the UI gate + strict no-cache /
// no-persist behaviour so nothing about the admin session or its data is ever
// stored on the device or restored from cache.

import { app, OWNER_EMAIL, DB_ID } from "./firebase-config.js";
import {
  getAuth, setPersistence, inMemoryPersistence,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app, DB_ID);

// (1) Session lives in RAM only — no IndexedDB/localStorage persistence.
//     Closing the tab logs you out; nothing to restore from cache.
await setPersistence(auth, inMemoryPersistence);

const gate = document.getElementById("gate");
const appEl = document.getElementById("app");
const gateMsg = document.getElementById("gate-msg");
const listEl = document.getElementById("list");
const countEl = document.getElementById("count");
const whoEl = document.getElementById("who-email");

let unsub = null;               // Firestore listener
let rejecting = false;          // suppress transient state while signing a wrong account out

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

document.getElementById("signin").addEventListener("click", async () => {
  gateMsg.textContent = "";
  gateMsg.className = "msg";
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    gateMsg.className = "msg err";
    gateMsg.textContent = err?.code === "auth/popup-closed-by-user"
      ? "Sign-in cancelled."
      : "Sign-in failed. Try again.";
  }
});

document.getElementById("signout").addEventListener("click", () => hardSignOut());

function hardSignOut() {
  if (unsub) { unsub(); unsub = null; }
  listEl.replaceChildren();      // wipe any rendered data from the DOM
  signOut(auth).catch(() => {});
}

onAuthStateChanged(auth, (user) => {
  if (rejecting) return;
  if (user && user.email === OWNER_EMAIL && user.emailVerified) {
    showApp(user);
  } else if (user) {
    // Signed in with the wrong account — reject and sign out.
    rejecting = true;
    signOut(auth).finally(() => {
      rejecting = false;
      showGate("That account isn't authorized to view this inbox.");
    });
  } else {
    showGate("");
  }
});

function showGate(message) {
  if (unsub) { unsub(); unsub = null; }
  listEl.replaceChildren();
  appEl.hidden = true;
  gate.hidden = false;
  gateMsg.className = message ? "msg err" : "msg";
  gateMsg.textContent = message;
}

function showApp(user) {
  gate.hidden = true;
  appEl.hidden = false;
  whoEl.textContent = user.email;
  startListening();
}

function startListening() {
  if (unsub) unsub();
  const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
  unsub = onSnapshot(
    q,
    (snap) => render(snap),
    (err) => {
      listEl.replaceChildren();
      const p = document.createElement("div");
      p.className = "empty";
      p.textContent = "Could not load inquiries (permission or connection error).";
      listEl.appendChild(p);
      console.error(err);
    }
  );
}

function fmtDate(ts) {
  if (!ts || !ts.toDate) return "just now";
  try {
    return ts.toDate().toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    });
  } catch { return ""; }
}

function tag(label, value) {
  if (!value) return null;
  const s = document.createElement("span");
  s.className = "tag";
  const b = document.createElement("b");
  b.textContent = value;
  s.append(document.createTextNode(label + ": "), b);
  return s;
}

function render(snap) {
  listEl.replaceChildren();
  let unread = 0;

  if (snap.empty) {
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "No inquiries yet.";
    listEl.appendChild(p);
    countEl.textContent = "";
    return;
  }

  snap.forEach((d) => {
    const x = d.data();
    if (!x.read) unread++;

    const card = document.createElement("div");
    card.className = "card" + (x.read ? "" : " unread");

    // top row: name + timestamp
    const top = document.createElement("div");
    top.className = "top";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = x.name || "(no name)";
    if (!x.read) {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = "New";
      name.append(" ", pill);
    }
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = fmtDate(x.createdAt);
    top.append(name, when);
    card.appendChild(top);

    // email (mailto is safe; text is escaped via textContent)
    if (x.email) {
      const em = document.createElement("div");
      em.className = "email";
      const a = document.createElement("a");
      a.href = "mailto:" + encodeURIComponent(x.email).replace(/%40/g, "@");
      a.textContent = x.email;
      em.appendChild(a);
      card.appendChild(em);
    }

    // tags
    const tags = document.createElement("div");
    tags.className = "tags";
    [
      tag("Company", x.company),
      tag("Team", x.teamSize),
      tag("Situation", x.situation),
      tag("Timeline", x.timeline),
      tag("Via", x.source),
    ].forEach((t) => t && tags.appendChild(t));
    if (tags.childElementCount) card.appendChild(tags);

    // message
    if (x.message) {
      const msg = document.createElement("p");
      msg.className = "msg";
      msg.textContent = x.message;
      card.appendChild(msg);
    }

    // mark as read / unread
    const actions = document.createElement("div");
    actions.className = "actions";
    const toggle = document.createElement("button");
    toggle.textContent = x.read ? "Mark as unread" : "Mark as read";
    toggle.addEventListener("click", () => {
      updateDoc(doc(db, "inquiries", d.id), { read: !x.read }).catch(console.error);
    });
    actions.appendChild(toggle);
    card.appendChild(actions);

    listEl.appendChild(card);
  });

  countEl.textContent = `${snap.size} total · ${unread} unread`;
}

// (2) No-cache / bfcache guard: if the page is restored from the back/forward
//     cache, reload it so it re-authenticates from scratch (never shows stale data).
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

// (3) Sign out when the tab is closed or navigated away — nothing lingers on
//     disk (session is in-memory only, so this leaves no trace to restore).
window.addEventListener("pagehide", () => hardSignOut());
