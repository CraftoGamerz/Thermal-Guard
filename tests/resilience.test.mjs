import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.mjs';
import { createProviders } from '../server/providers.mjs';

const csv = 'latitude,longitude,frp,acq_date,acq_time,confidence,satellite\n22.1,70.1,82,2026-09-12,0430,h,N20\n';
const query = { source: 'NOAA20', days: 1, bbox: [68, 6, 98, 37], mode: 'live' };
test('upstream outage returns a timestamped stale snapshot and never synthetic observations', async () => {
  const store = createStore(':memory:');
  let offline = false;
  const p = createProviders(store, { fetcher: async () => { if (offline) throw new Error('offline'); return new Response(csv); } });
  try {
    const first = await p.events(query);
    store.db.prepare('UPDATE snapshots SET saved_at=?').run('2000-01-01T00:00:00Z');
    offline = true;
    const fallback = await p.events(query);
    assert.equal(fallback.meta.stale, true); assert.equal(fallback.meta.mode, 'live');
    assert.equal(fallback.meta.fetchedAt, first.meta.fetchedAt);
    assert.deepEqual(fallback.events.map(e => e.id), first.events.map(e => e.id));
    assert.ok(fallback.meta.warning.includes('refresh failed'));
  } finally { store.db.close(); }
});
test('simultaneous NASA requests coalesce and optional keys are never returned in provenance', async () => {
  const store = createStore(':memory:'); let calls = 0;
  const p = createProviders(store, { mapKey: 'private-key-for-test', fetcher: async url => { assert.ok(url.includes('/api/area/csv/private-key-for-test/')); calls++; await new Promise(r => setTimeout(r, 20)); return new Response(csv); } });
  try { const results = await Promise.all([p.events(query), p.events(query)]); assert.equal(calls, 1); assert.ok(!JSON.stringify(results).includes('private-key-for-test')); } finally { store.db.close(); }
});
test('reviews and watch areas persist after reopening SQLite', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'thermalguard-test-')), file = join(dir, 'test.sqlite'); let store;
  try {
    store = createStore(file);
    const p = createProviders(store, { fetcher: async () => new Response(csv) });
    const { events } = await p.events(query);
    store.review(events[0].id, { status: 'deferred', classification: 'Uncertain / Other', note: 'More evidence required.', analyst: 'Unit test' });
    store.addArea('Test area', query.bbox); store.db.close(); store = createStore(file);
    assert.equal(store.reviews(events[0].id)[0].status, 'deferred'); assert.equal(store.areas()[0].name, 'Test area');
    assert.ok(store.event(events[0].id));
  } finally { store?.db.close(); await rm(dir, { recursive: true, force: true }); }
});
