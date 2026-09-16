const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const workspacePath = "workspaces/thermal-guard";
let firebasePromise;

export const firebaseConfigured = () =>
  Object.values(firebaseConfig).every((value) => typeof value === "string" && value);

function message(error) {
  if (error?.code === "permission-denied")
    return "Firestore rules rejected this browser. Enable Anonymous Auth and deploy the supplied rules.";
  if (error?.code === "unavailable")
    return "Firebase is currently unreachable. Local case records are still available.";
  if (error?.code === "not-found")
    return "Firestore has not been created for this Firebase project yet.";
  return error?.message || "Firebase collaboration is unavailable.";
}

async function firebase() {
  if (!firebaseConfigured()) throw Error("Firebase is not configured for this build.");
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [{ getApps, getApp, initializeApp }, authSdk, firestoreSdk] =
        await Promise.all([
          import("firebase/app"),
          import("firebase/auth"),
          import("firebase/firestore"),
        ]);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      if (!auth.currentUser) await authSdk.signInAnonymously(auth);
      return { db: firestoreSdk.getFirestore(app), firestoreSdk, uid: auth.currentUser?.uid };
    })().catch((error) => {
      firebasePromise = null;
      throw error;
    });
  }
  return firebasePromise;
}

function digest(value) {
  let hash = 5381;
  for (const char of value) hash = (hash * 33) ^ char.charCodeAt(0);
  return (hash >>> 0).toString(36);
}

function safeCase(item) {
  return {
    id: item.id,
    title: String(item.title || "").slice(0, 160),
    eventId: String(item.event?.id || ""),
    lat: Number(item.event?.lat),
    lon: Number(item.event?.lon),
    lastSeen: String(item.event?.lastSeen || ""),
    maxFrp: Number(item.event?.maxFrp),
    status: String(item.status || "new"),
    assignee: String(item.assignee || "Unassigned").slice(0, 80),
    note: String(item.note || "").slice(0, 2000),
    checklist: item.checklist || {},
    updatedAt: String(item.updatedAt || new Date().toISOString()),
    actor: String(item.activity?.at(-1)?.actor || "Workspace user").slice(0, 80),
  };
}

export async function mirrorCaseToFirebase(item) {
  if (!firebaseConfigured() || !item?.id) return { state: "unconfigured" };
  try {
    const { db, firestoreSdk } = await firebase();
    const batch = firestoreSdk.writeBatch(db);
    batch.set(
      firestoreSdk.doc(db, workspacePath, "cases", item.id),
      safeCase(item),
      { merge: true },
    );
    for (const activity of (item.activity || []).slice(-200)) {
      const actor = String(activity.actor || "Workspace user").slice(0, 80);
      const occurredAt = String(activity.at || item.updatedAt);
      const text = String(activity.text || "").slice(0, 2100);
      const id = `${item.id}_${Date.parse(occurredAt) || 0}_${digest(`${actor}:${text}`)}`;
      batch.set(
        firestoreSdk.doc(db, workspacePath, "activities", id),
        {
          caseId: item.id,
          caseTitle: String(item.title || "").slice(0, 160),
          actor,
          text,
          occurredAt,
        },
        { merge: true },
      );
    }
    await batch.commit();
    return { state: "live" };
  } catch (error) {
    return { state: "error", message: message(error) };
  }
}

export async function subscribeToFirebaseActivity(onUpdate, onStatus) {
  if (!firebaseConfigured()) {
    onStatus({ state: "unconfigured" });
    return () => {};
  }
  onStatus({ state: "connecting" });
  try {
    const { db, firestoreSdk, uid } = await firebase();
    const query = firestoreSdk.query(
      firestoreSdk.collection(db, workspacePath, "activities"),
      firestoreSdk.orderBy("occurredAt", "desc"),
      firestoreSdk.limit(12),
    );
    return firestoreSdk.onSnapshot(
      query,
      (snapshot) => {
        onUpdate(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        onStatus({ state: "live", uid });
      },
      (error) => onStatus({ state: "error", message: message(error) }),
    );
  } catch (error) {
    onStatus({ state: "error", message: message(error) });
    return () => {};
  }
}
