import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.mjs";
import { createProviders } from "./providers.mjs";
import { createAnalysis, CSV_LIMIT } from "./analysis.mjs";
import { bboxValue, SOURCES, CLASSES, VERSION, fail } from "./processing.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
function tokenMatches(actual, expected) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function body(req, limit = 16384) {
  if (!String(req.headers["content-type"]).includes("application/json"))
    throw fail("Expected application/json.", 415);
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail("Request is too large.", 413);
    parts.push(chunk);
  }
  try {
    const b = JSON.parse(Buffer.concat(parts).toString());
    if (!b || Array.isArray(b) || typeof b !== "object") throw new Error();
    return b;
  } catch {
    throw fail("Request must contain a valid JSON object.");
  }
}
function text(value, min, max, label) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw fail(`${label} must contain ${min}-${max} characters.`);
  return value.trim();
}

export async function createApplication({
  dbPath = resolve(root, "data/thermalguard.sqlite"),
  token = process.env.WORKSPACE_TOKEN || "",
  mapKey = process.env.FIRMS_MAP_KEY || "",
  fetcher = fetch,
  dev = false,
  analysisOptions = {},
} = {}) {
  const store = createStore(dbPath),
    providers = createProviders(store, { mapKey, fetcher });
  const analysis = createAnalysis(store, providers, analysisOptions);
  const vite = dev
    ? await (
        await import("vite")
      ).createServer({ root, server: { middlewareMode: true }, appType: "spa" })
    : null;
  const rates = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        if (req.method === "GET" && url.pathname === "/api/health")
          return send(res, 200, {
            ok: true,
            keyConfigured: !!mapKey,
            authRequired: !!token,
            model: VERSION,
            providers: SOURCES,
            analysis: {
              engine: "XGBoost",
              target: "Observed FRP consistency",
              execution: "server-side Python",
              endpoint: "/api/analysis/jobs",
            },
          });
        if (
          token &&
          !tokenMatches(
            String(req.headers.authorization || ""),
            `Bearer ${token}`,
          )
        )
          throw fail("Enter the workspace access token to connect.", 401);
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host)
          throw fail("Cross-origin API requests are not allowed.", 403);
        const who = req.socket.remoteAddress,
          now = Date.now();
        let rate = rates.get(who);
        if (!rate || now - rate.start > 60000) {
          rate = { start: now, count: 0 };
          rates.set(who, rate);
        }
        if (++rate.count > 240)
          throw fail("Too many requests. Try again in a minute.", 429);
        if (rates.size > 1000)
          for (const [key, item] of rates)
            if (now - item.start > 60000) rates.delete(key);
        if (url.pathname === "/api/analysis/jobs" && req.method === "POST")
          return send(
            res,
            202,
            analysis.start(await body(req, CSV_LIMIT + 200000)),
          );
        const jobMatch = /^\/api\/analysis\/jobs\/([a-f0-9-]{36})$/.exec(
          url.pathname,
        );
        if (jobMatch && req.method === "GET")
          return send(res, 200, analysis.get(jobMatch[1]));
        if (url.pathname === "/api/events" && req.method === "GET") {
          const source = url.searchParams.get("source") || "NOAA20",
            days = Number(url.searchParams.get("days") || 1),
            mode = url.searchParams.get("mode") || "live";
          if (
            !Object.hasOwn(SOURCES, source) ||
            ![1, 2, 7].includes(days) ||
            !["live", "replay"].includes(mode)
          )
            throw fail("Invalid source, time window, or mode.");
          return send(
            res,
            200,
            await providers.events({
              source,
              days,
              mode,
              bbox: bboxValue(url.searchParams.get("bbox") || undefined),
            }),
          );
        }
        const reviewMatch = /^\/api\/events\/([a-zA-Z0-9-]+)\/reviews$/.exec(
          url.pathname,
        );
        if (reviewMatch) {
          const id = reviewMatch[1];
          if (!store.event(id))
            throw fail(
              "This event is not in a retrieved snapshot. Reload the feed.",
              404,
            );
          if (req.method === "GET")
            return send(res, 200, { reviews: store.reviews(id) });
          if (req.method === "POST") {
            const b = await body(req);
            if (
              !["confirmed", "rejected", "deferred"].includes(b.status) ||
              !CLASSES.includes(b.classification)
            )
              throw fail("Choose a valid review decision and source class.");
            const value = {
              status: b.status,
              classification: b.classification,
              note: text(b.note, 3, 2000, "Rationale"),
              analyst: text(b.analyst, 1, 80, "Analyst name"),
            };
            return send(res, 201, { reviews: store.review(id, value) });
          }
        }
        if (url.pathname === "/api/context" && req.method === "GET") {
          const rawLat = url.searchParams.get("lat"),
            rawLon = url.searchParams.get("lon"),
            lat = Number(rawLat),
            lon = Number(rawLon);
          if (
            !rawLat ||
            !rawLon ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            Math.abs(lat) > 90 ||
            Math.abs(lon) > 180
          )
            throw fail("Valid latitude and longitude are required.");
          return send(res, 200, await providers.context(lat, lon));
        }
        if (url.pathname === "/api/areas") {
          if (req.method === "GET")
            return send(res, 200, { areas: store.areas() });
          if (req.method === "POST") {
            const b = await body(req);
            if (!Array.isArray(b.bbox))
              throw fail("Bounding coordinates must be a four-value array.");
            return send(res, 201, {
              area: store.addArea(
                text(b.name, 2, 60, "Area name"),
                bboxValue(b.bbox),
              ),
            });
          }
        }
        if (url.pathname.startsWith("/api/areas/") && req.method === "DELETE") {
          if (!store.deleteArea(url.pathname.split("/").at(-1)))
            throw fail("Area not found.", 404);
          res.writeHead(204);
          return res.end();
        }
        throw fail("API route not found.", 404);
      }
      if (vite) return vite.middlewares(req, res);
      if (!["GET", "HEAD"].includes(req.method))
        throw fail("Method not allowed.", 405);
      const dist = resolve(root, "dist"),
        path = resolve(dist, "." + decodeURIComponent(url.pathname));
      if (path !== dist && !path.startsWith(dist + sep))
        throw fail("Invalid path.", 400);
      let target = path;
      try {
        if (!(await stat(path)).isFile()) target = resolve(dist, "index.html");
      } catch {
        if (extname(path)) throw fail("Asset not found.", 404);
        target = resolve(dist, "index.html");
      }
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".jpg": "image/jpeg",
        ".woff2": "font/woff2",
      };
      const file = await readFile(target);
      res.writeHead(200, {
        "Content-Type": types[extname(target)] || "application/octet-stream",
        "Cache-Control":
          extname(target) === ".html" ? "no-cache" : "public, max-age=3600",
      });
      res.end(req.method === "HEAD" ? undefined : file);
    } catch (e) {
      if (!res.headersSent)
        send(res, e.status || 500, {
          error: e.status
            ? e.message
            : "The server could not complete this request.",
        });
      else res.end();
    }
  });
  return {
    server,
    store,
    async close() {
      await new Promise((r) => server.close(r));
      await vite?.close();
      await analysis.close();
      store.db.close();
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const host = process.env.HOST || "127.0.0.1";
  if (
    !["127.0.0.1", "localhost", "::1"].includes(host) &&
    (process.env.WORKSPACE_TOKEN || "").length < 24
  )
    throw new Error(
      "Set WORKSPACE_TOKEN to at least 24 characters before binding externally.",
    );
  const app = await createApplication({ dev: process.argv.includes("--dev") });
  const port = Number(process.env.PORT || 4173);
  app.server.listen(port, host, () =>
    console.log(`ThermalGuard ready at http://${host}:${port}`),
  );
  process.on("SIGINT", async () => {
    await app.close();
    process.exit(0);
  });
}
