import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ORIGIN, LOGO_FILES } from "./constants.js";
import { getSnapshot as defaultGetSnapshot } from "./ledger.js";
import { serializeMetadata } from "./metadata.js";
import { renderHome, renderPhoto, renderTokenomics } from "./render.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SECURITY = {
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://token.xrpltoken.com https://xrpltoken.com; connect-src 'self'; object-src 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const FILE_ROUTES = {
  "/.well-known/xrp-ledger.toml": { file: "records/.well-known/xrp-ledger.toml", cache: "private, max-age=300", cors: true },
  "/.well-known/did.json": { file: "records/.well-known/did.json", cache: "private, max-age=300", cors: true },
  "/.well-known/did-configuration.json": { file: "records/.well-known/did-configuration.json", cache: "private, max-age=300", cors: true },
  "/did/issuer.json": { file: "records/did/issuer.json", cache: "private, max-age=300", cors: true },
  "/did/treasury.json": { file: "records/did/treasury.json", cache: "private, max-age=300", cors: true },
  "/did/founder.json": { file: "records/did/founder.json", cache: "private, max-age=300", cors: true },
  "/did/faucet.json": { file: "records/did/faucet.json", cache: "private, max-age=300", cors: true },
  "/identity/did/org.json": { file: "records/identity/did/org.json", cache: "private, max-age=300", cors: true },
  "/identity/did/issuer.json": { file: "records/did/issuer.json", cache: "private, max-age=300", cors: true },
  "/identity/did/treasury.json": { file: "records/did/treasury.json", cache: "private, max-age=300", cors: true },
  "/identity/did/founder.json": { file: "records/did/founder.json", cache: "private, max-age=300", cors: true },
  "/identity/did/faucet.json": { file: "records/did/faucet.json", cache: "private, max-age=300", cors: true },
  "/favicon.ico": { file: "public/favicon.ico", cache: "private, max-age=3600" },
  "/xto-logo.png": { file: "public/xto-logo.png", cache: "private, max-age=3600", cors: true },
  "/xto-logo-1024.png": { file: "public/xto-logo-1024.png", cache: "private, max-age=3600", cors: true },
  "/tokenphoto.jpg": { file: "public/tokenphoto.jpg", cache: "private, max-age=3600", cors: true },
  "/og-xto.png": { file: "public/og-xto.png", cache: "private, max-age=3600", cors: true },
  "/android-chrome-192x192.png": { file: "public/android-chrome-192x192.png", cache: "private, max-age=3600" },
  "/android-chrome-512x512.png": { file: "public/android-chrome-512x512.png", cache: "private, max-age=3600" },
  "/apple-touch-icon.png": { file: "public/apple-touch-icon.png", cache: "private, max-age=3600" },
  "/site.webmanifest": { file: "public/site.webmanifest", cache: "private, max-age=3600", cors: true },
  "/official-records.js": { file: "public/official-records.js", cache: "private, max-age=3600" },
  "/robots.txt": { file: "public/robots.txt", cache: "private" },
  "/sitemap.xml": { file: "public/sitemap.xml", cache: "private" },
};

const PUBLISHED = [
  { href: "/.well-known/did.json", label: "Token-host DID", file: "records/.well-known/did.json" },
  { href: "/.well-known/did-configuration.json", label: "DID configuration", file: "records/.well-known/did-configuration.json" },
  { href: "/did/issuer.json", label: "Issuer DID", file: "records/did/issuer.json" },
  { href: "/did/treasury.json", label: "Treasury DID", file: "records/did/treasury.json" },
  { href: "/did/founder.json", label: "Founder DID", file: "records/did/founder.json" },
  { href: "/did/faucet.json", label: "Faucet DID", file: "records/did/faucet.json" },
  { href: "/identity/did/org.json", label: "Organization DID", file: "records/identity/did/org.json" },
  { href: "/identity/did/issuer.json", label: "Issuer DID (identity path)", file: "records/did/issuer.json" },
  { href: "/identity/did/treasury.json", label: "Treasury DID (identity path)", file: "records/did/treasury.json" },
  { href: "/identity/did/founder.json", label: "Founder DID (identity path)", file: "records/did/founder.json" },
  { href: "/identity/did/faucet.json", label: "Faucet DID (identity path)", file: "records/did/faucet.json" },
];

export function sha256(body) {
  return createHash("sha256").update(body).digest("hex");
}

function contentType(file) {
  if (file.endsWith(".json") || file.endsWith(".webmanifest")) return file.endsWith(".webmanifest") ? "application/manifest+json" : "application/json; charset=utf-8";
  if (file.endsWith(".toml") || file.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".ico")) return "image/x-icon";
  if (file.endsWith(".xml")) return "application/xml; charset=utf-8";
  return "application/octet-stream";
}

function read(base, file) {
  return readFileSync(path.join(base, file));
}

function send(res, status, body, headers, method) {
  const payload = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, {
    ...SECURITY,
    "content-length": String(method === "HEAD" ? payload.length : payload.length),
    ...headers,
  });
  res.end(method === "HEAD" ? undefined : payload);
}

export function createServer(options = {}) {
  const base = options.root ?? root;
  const getSnapshot = options.getSnapshot ?? defaultGetSnapshot;
  const now = options.now ?? (() => new Date());

  return createHttpServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const pathname = url.pathname;
      if (req.method !== "GET" && req.method !== "HEAD") {
        send(res, 405, "Method not allowed\n", { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }, req.method);
        return;
      }

      if (pathname === "/api/health") {
        const snapshot = await getSnapshot();
        const body = `${JSON.stringify({ status: snapshot ? "ok" : "degraded", checkedAt: now().toISOString() })}\n`;
        send(res, 200, body, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        }, req.method);
        return;
      }
      if (pathname.startsWith("/api/")) {
        send(res, 404, `${JSON.stringify({ error: "Not found" })}\n`, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        }, req.method);
        return;
      }

      const fileRoute = FILE_ROUTES[pathname];
      if (fileRoute) {
        const body = read(base, fileRoute.file);
        send(res, 200, body, {
          "content-type": contentType(fileRoute.file),
          "cache-control": fileRoute.cache,
          ...(fileRoute.cors ? { "access-control-allow-origin": "*" } : {}),
        }, req.method);
        return;
      }

      if (pathname === "/" || pathname === "/photo" || pathname === "/tokenomics" || pathname === "/token.json" || pathname === "/metadata.json") {
        const snapshot = await getSnapshot();
        const metadataBody = Buffer.from(serializeMetadata(snapshot));
        const metadataDoc = { bytes: metadataBody.length, sha256: sha256(metadataBody) };
        if (pathname === "/token.json" || pathname === "/metadata.json") {
          send(res, 200, metadataBody, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          }, req.method);
          return;
        }
        if (pathname === "/") {
          const tomlBuf = read(base, "records/.well-known/xrp-ledger.toml");
          const documents = [
            ...PUBLISHED.map((doc) => {
              const body = read(base, doc.file);
              return { href: doc.href, label: doc.label, bytes: body.length, sha256: sha256(body) };
            }),
            { href: "/token.json", label: "token.json", ...metadataDoc },
            { href: "/metadata.json", label: "metadata.json", ...metadataDoc },
          ];
          const html = renderHome({
            snapshot,
            toml: { bytes: tomlBuf.length, sha256: sha256(tomlBuf), text: tomlBuf.toString("utf8") },
            documents,
          });
          send(res, 200, html, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" }, req.method);
          return;
        }
        if (pathname === "/photo") {
          const logos = LOGO_FILES.map((logo) => {
            const body = read(base, logo.file);
            return { ...logo, bytes: body.length, sha256: sha256(body) };
          });
          send(res, 200, renderPhoto({ logos }), {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "private, max-age=3600",
          }, req.method);
          return;
        }
        send(res, 200, renderTokenomics({ snapshot, now: now() }), {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, max-age=60",
        }, req.method);
        return;
      }

      send(res, 301, "", {
        location: `${APP_ORIGIN}${pathname}${url.search}`,
        "cache-control": "no-cache, must-revalidate",
        "content-type": "text/html; charset=utf-8",
      }, req.method);
    } catch {
      send(res, 500, `${JSON.stringify({ error: "Server error" })}\n`, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      }, req.method);
    }
  });
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const port = Number(process.env.PORT || 8080);
  createServer().listen(port, () => {
    process.stdout.write(`XTO records listening on ${port}\n`);
  });
}
