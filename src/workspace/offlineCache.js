import { useEffect, useState } from "react";

const KEY = "thermalguard-live-snapshots-v1";
export const SNAPSHOT_LIMIT = 6;
export const SNAPSHOT_BYTES = 2_500_000;

function available() {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}
function validSnapshot(item) {
  return (
    item &&
    typeof item === "object" &&
    Number.isFinite(Date.parse(item.savedAt)) &&
    item.feed?.meta?.mode === "live" &&
    Array.isArray(item.feed.events)
  );
}
function bytes(value) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function snapshotKey({ source, days, bbox }) {
  return `${source}:${days}:${bbox.map(Number).join(",")}`;
}
export function compactSnapshots(value, limit = SNAPSHOT_LIMIT, maxBytes = SNAPSHOT_BYTES) {
  const entries = Object.entries(value && typeof value === "object" ? value : {})
    .filter(([entryKey, item]) => entryKey && validSnapshot(item))
    .sort(
      ([aKey, a], [bKey, b]) =>
        Date.parse(b.savedAt) - Date.parse(a.savedAt) || aKey.localeCompare(bKey),
    );
  const compacted = {};
  for (const [entryKey, item] of entries) {
    if (Object.keys(compacted).length >= limit) break;
    const candidate = { ...compacted, [entryKey]: item };
    if (bytes(candidate) <= maxBytes) compacted[entryKey] = item;
  }
  return compacted;
}
function read() {
  if (!available()) return {};
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "{}");
    return compactSnapshots(value);
  } catch {
    return {};
  }
}
function summary(snapshots, storageAvailable = available()) {
  const entries = Object.values(snapshots);
  return {
    storageAvailable,
    entries: entries.length,
    bytes: bytes(snapshots),
    limit: SNAPSHOT_LIMIT,
    maxBytes: SNAPSHOT_BYTES,
    newestSavedAt: entries.reduce(
      (latest, item) =>
        !latest || Date.parse(item.savedAt) > Date.parse(latest)
          ? item.savedAt
          : latest,
      null,
    ),
  };
}
export function liveCacheSummary() {
  const storageAvailable = available();
  return summary(storageAvailable ? read() : {}, storageAvailable);
}
export function saveLiveSnapshot(query, feed) {
  if (
    !available() ||
    feed?.meta?.mode !== "live" ||
    !Array.isArray(feed.events)
  )
    return liveCacheSummary();
  try {
    const snapshots = read();
    const id = snapshotKey(query);
    const previous = snapshots[id];
    snapshots[id] = { savedAt: new Date().toISOString(), feed };
    let compacted = compactSnapshots(snapshots);
    // Keep an older exact-query recovery snapshot when a newer response is too large for the local budget.
    if (!Object.hasOwn(compacted, id) && previous) {
      snapshots[id] = previous;
      compacted = compactSnapshots(snapshots);
    }
    localStorage.setItem(KEY, JSON.stringify(compacted));
    return summary(compacted);
  } catch {
    // Quota or privacy mode: the live experience still works without a snapshot.
    return liveCacheSummary();
  }
}
export function loadLiveSnapshot(query) {
  const item = read()[snapshotKey(query)];
  if (!item?.feed?.events || !item.savedAt) return null;
  return {
    ...item.feed,
    meta: {
      ...item.feed.meta,
      cached: true,
      stale: true,
      offlineSnapshot: true,
      snapshotSavedAt: item.savedAt,
      warning: `Offline snapshot saved ${new Date(item.savedAt).toLocaleString()}. It is not a fresh satellite retrieval.`,
    },
  };
}
export function clearLiveSnapshots() {
  if (!available()) return liveCacheSummary();
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Privacy modes can deny writes; an unchanged summary keeps the UI honest.
  }
  return liveCacheSummary();
}
export function useNetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);
  return online;
}
