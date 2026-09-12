import { lazy, Suspense, useEffect, useState } from "react";
import Landing from "./workspace/Landing";
import { DISTRICTS, restoreManager } from "./workspace/districts";
import "./workspace/earth.css";
const Workspace = lazy(() => import("./workspace/Workspace"));
const inWorkspace = () =>
  ["overview", "queue", "analytics", "areas", "sources", "analyser"].includes(
    location.hash.slice(1),
  );
export default function App() {
  const [open, setOpen] = useState(inWorkspace),
    [manager, setManager] = useState(restoreManager);
  const [initialArea, setInitialArea] = useState(() =>
    DISTRICTS.find((d) => d.id === restoreManager()?.districtId),
  );
  useEffect(() => {
    const change = () => setOpen(inWorkspace());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  function enter(district, session) {
    setInitialArea(
      district || DISTRICTS.find((d) => d.id === session?.districtId),
    );
    setManager(session);
    try {
      if (session) {
        sessionStorage.setItem("tg_demo_manager_v1", JSON.stringify(session));
        localStorage.setItem("tg_analyst_name", `${session.name} (demo)`);
      }
    } catch {
      /* Storage restrictions do not prevent navigation. */
    }
    location.hash = "overview";
    setOpen(true);
    window.scrollTo(0, 0);
  }
  function home(logout = false) {
    if (logout) {
      setManager(null);
      try {
        sessionStorage.removeItem("tg_demo_manager_v1");
        localStorage.removeItem("tg_analyst_name");
      } catch {
        /* Storage may be disabled. */
      }
    }
    location.hash = "home";
    setOpen(false);
    window.scrollTo(0, 0);
  }
  return open ? (
    <Suspense
      fallback={
        <div className="earth-loading">Opening monitoring workspace…</div>
      }
    >
      <Workspace
        initialArea={initialArea}
        manager={manager}
        onHome={() => home()}
        onLogout={() => home(true)}
      />
    </Suspense>
  ) : (
    <Landing onEnter={enter} manager={manager} />
  );
}
