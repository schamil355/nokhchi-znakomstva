const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT_DIR = process.argv[2] || "dist";
const ROOT_DIR = process.cwd();
const WEB_DIR = path.join(ROOT_DIR, "web");

const ensureFile = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    console.error(`[postexport] missing ${label}: ${filePath}`);
    process.exit(1);
  }
};

const copyFileIfExists = (src, dest) => {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
};

const copyDirIfExists = (src, dest) => {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

ensureFile(path.join(ROOT_DIR, "package.json"), "package.json");
ensureFile(path.join(OUT_DIR, "index.html"), "index.html");

const manifestPath = path.join(WEB_DIR, "manifest.json");
const swPath = path.join(WEB_DIR, "service-worker.js");
const faviconPath = path.join(WEB_DIR, "favicon.png");
const iconsDir = path.join(WEB_DIR, "icons");

const manifestCopied = copyFileIfExists(manifestPath, path.join(OUT_DIR, "manifest.json"));
copyFileIfExists(swPath, path.join(OUT_DIR, "service-worker.js"));
copyFileIfExists(faviconPath, path.join(OUT_DIR, "favicon.png"));
copyDirIfExists(iconsDir, path.join(OUT_DIR, "icons"));

let manifest = null;
if (manifestCopied) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.warn("[postexport] failed to parse manifest.json", error);
  }
}

const appName = escapeHtml(manifest?.name || "Meetmate");
const description = escapeHtml(manifest?.description || "Installable web app");
const marker = "<!-- pwa-meta -->";
const envMarker = "<!-- runtime-env -->";

const runtimeEnv = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WEB_PUSH_VAPID_KEY: process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_PROFILE_BUCKET: process.env.EXPO_PUBLIC_PROFILE_BUCKET,
  EXPO_PUBLIC_STORAGE_PUBLIC: process.env.EXPO_PUBLIC_STORAGE_PUBLIC,
  EXPO_PUBLIC_VERIFY_ENDPOINT: process.env.EXPO_PUBLIC_VERIFY_ENDPOINT,
  EXPO_PUBLIC_VERIFY_PROVIDER: process.env.EXPO_PUBLIC_VERIFY_PROVIDER
};

Object.keys(runtimeEnv).forEach((key) => {
  const value = runtimeEnv[key];
  if (value === undefined || value === null || value === "") {
    delete runtimeEnv[key];
  }
});

const headTags = [
  marker,
  `    <meta name="description" content="${description}" />`,
  '    <meta name="apple-mobile-web-app-capable" content="yes" />',
  `    <meta name="apple-mobile-web-app-title" content="${appName}" />`,
  '    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '    <meta name="mobile-web-app-capable" content="yes" />',
  '    <style>html, body, #root { background-color: #0b1f16; }</style>',
  '    <link rel="manifest" href="/manifest.json" />',
  '    <link rel="icon" href="/favicon.png" />',
  '    <link rel="icon" sizes="192x192" href="/icons/icon-192.png" />',
  '    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
].join("\n");

const indexPath = path.join(OUT_DIR, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
if (!html.includes(marker)) {
  html = html.replace("</head>", `${headTags}\n  </head>`);
  fs.writeFileSync(indexPath, html);
  console.log("[postexport] injected PWA meta tags");
} else {
  console.log("[postexport] PWA meta tags already present");
}

if (!html.includes(envMarker)) {
  const envJson = JSON.stringify(runtimeEnv).replace(/</g, "\\u003c");
  const envTags = [envMarker, `    <script>window.__ENV__ = ${envJson};</script>`].join("\n");
  html = html.replace("</head>", `${envTags}\n  </head>`);
  fs.writeFileSync(indexPath, html);
  console.log("[postexport] injected runtime env");
} else {
  console.log("[postexport] runtime env already present");
}

const moduleScriptRegex = /<script\s+(?![^>]*type="module")([^>]*_expo\/static\/js\/web\/[^"]+\.js[^>]*)><\/script>/;
if (moduleScriptRegex.test(html)) {
  html = html.replace(moduleScriptRegex, '<script type="module" $1></script>');
  fs.writeFileSync(indexPath, html);
  console.log("[postexport] marked web bundle as type=module");
}

const shouldUploadSourcemaps =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

if (shouldUploadSourcemaps) {
  console.log("[postexport] uploading sourcemaps to Sentry");
  try {
    execSync(`npx sentry-cli sourcemaps inject ${OUT_DIR}`, {
      stdio: "inherit",
      env: process.env
    });
    execSync(`npx sentry-cli sourcemaps upload ${OUT_DIR}`, {
      stdio: "inherit",
      env: process.env
    });
    console.log("[postexport] Sentry sourcemaps uploaded");
  } catch (error) {
    console.error("[postexport] Sentry sourcemaps upload failed");
    throw error;
  }
} else {
  console.log("[postexport] Sentry sourcemaps upload skipped (missing SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT)");
}

console.log("[postexport] completed");
