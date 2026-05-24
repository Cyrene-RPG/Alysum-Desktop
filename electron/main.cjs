// Alysum Desktop — Electron shell around the Alysum-Web site (git submodule in /site).

const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const url = require("url");

const PROJECT_ROOT = app.isPackaged ? app.getAppPath() : path.join(__dirname, "..");
const SITE_ROOT = path.join(PROJECT_ROOT, "site");
const DESKTOP_UI_ROOT = path.join(PROJECT_ROOT, "desktop-ui");
const PREFERRED_PORT = 17923;
const isDev = process.argv.includes("--dev");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

function resolveRequest(pathname) {
  if (pathname === "/" || pathname === "/index.html" || pathname === "/desktop/home.html") {
    return { root: DESKTOP_UI_ROOT, rel: "home.html" };
  }
  if (pathname.startsWith("/desktop/")) {
    return { root: DESKTOP_UI_ROOT, rel: pathname.slice("/desktop/".length) };
  }
  const rel = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return { root: SITE_ROOT, rel };
}

function buildHandler() {
  return (req, res) => {
    try {
      let pathname = decodeURIComponent(url.parse(req.url).pathname || "/");

      if (pathname === "/sw.js") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("Service worker disabled in desktop app");
      }

      const { root, rel } = resolveRequest(pathname);
      const diskPath = path.normalize(path.join(root, rel));

      if (!diskPath.startsWith(root)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }

      fs.stat(diskPath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          return res.end("Not found");
        }

        const ext = path.extname(diskPath).toLowerCase();
        const isDesktopFile = root === DESKTOP_UI_ROOT;
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": isDev || isDesktopFile ? "no-store" : "public, max-age=3600",
        });
        fs.createReadStream(diskPath).pipe(res);
      });
    } catch (error) {
      console.error("[alysum-desktop] server error:", error);
      try {
        res.writeHead(500);
        res.end("Server error");
      } catch (_) {}
    }
  };
}

function startLocalServer() {
  return new Promise((resolve) => {
    const server = http.createServer(buildHandler());
    let resolved = false;

    server.on("error", (err) => {
      if (err?.code === "EADDRINUSE" && !resolved) {
        server.listen(0, "127.0.0.1");
        return;
      }
      console.error("[alysum-desktop] local server error:", err);
    });

    server.on("listening", () => {
      if (resolved) return;
      resolved = true;
      resolve(server.address().port);
    });

    server.listen(PREFERRED_PORT, "127.0.0.1");
  });
}

async function purgeServiceWorkers() {
  try {
    const ses = session.defaultSession;
    if (ses?.clearStorageData) {
      await ses.clearStorageData({ storages: ["serviceworkers"] });
    }
    if (ses?.clearCache) {
      await ses.clearCache();
    }
  } catch (error) {
    console.warn("[alysum-desktop] could not purge service workers:", error);
  }
}

let mainWindow = null;
let splashWindow = null;

const SPLASH_MIN_MS = 5000;
const SPLASH_EXIT_MS = 550;

/** In the desktop app, send website login/signup pages to the in-app gate. */
function rewriteDesktopAuthUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return null;
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (path.endsWith("/login.html") || path === "/login.html") {
      return `http://${u.host}/desktop/home.html${u.search}`;
    }
    if (path.endsWith("/signup.html") || path === "/signup.html") {
      const params = new URLSearchParams(u.search);
      params.set("tab", "signup");
      return `http://${u.host}/desktop/home.html?${params.toString()}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 340,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow.on("closed", () => {
    splashWindow = null;
  });

  await splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.show();
}

async function createWindow() {
  if (!fs.existsSync(SITE_ROOT)) {
    console.error("[alysum-desktop] site/ folder missing. Run: git submodule update --init --recursive");
    app.quit();
    return;
  }

  const port = await startLocalServer();
  const startUrl = `http://127.0.0.1:${port}/desktop/home.html?v=${Date.now()}`;
  const splashStarted = Date.now();

  await createSplashWindow();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#020b18",
    autoHideMenuBar: !isDev,
    title: "Alysum",
    icon: path.join(SITE_ROOT, "Alysum-3.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) {
      shell.openExternal(target);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const rewritten = rewriteDesktopAuthUrl(targetUrl);
    if (rewritten && rewritten !== targetUrl) {
      event.preventDefault();
      mainWindow.loadURL(rewritten);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(startUrl);

  const waitMs = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStarted));
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("splash:finish");
    await new Promise((resolve) => setTimeout(resolve, SPLASH_EXIT_MS));
    splashWindow.close();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }

  if (isDev && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  buildMenu();
  await purgeServiceWorkers();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
