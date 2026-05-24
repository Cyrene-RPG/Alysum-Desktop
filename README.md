# Alysum Desktop

Electron desktop app for [Alysum](https://alysumwriting.com) — local install, sign-in gate, and **Host Local Version** (offline Studio on your PC).

This repository is **separate from the website**. The web app lives in a git submodule:

| Path | Repository |
|------|------------|
| `site/` | [Cyrene-RPG/Alysum-Web](https://github.com/Cyrene-RPG/Alysum-Web) |

Desktop-only code is in `electron/`, `desktop-ui/`, and the root `package.json`.

## Clone

```bash
git clone --recurse-submodules https://github.com/YOUR_ORG/Alysum-Desktop.git
cd Alysum-Desktop
npm install
npm start
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

## Develop

```bash
npm start          # run app
npm run dev        # dev mode (cache disabled for desktop UI)
npm run site:update   # pull latest website into site/
npm run dist:win   # Windows installer → dist/
```

## Repo layout

```
Alysum-Desktop/
├── electron/       # Main process, splash, local HTTP server
├── desktop-ui/     # App sign-in gate (/desktop/home.html)
├── site/           # Submodule → Alysum-Web (Studio, editor, encyclopedia, …)
├── scripts/        # Build checks
└── package.json
```

## Working on `site/` changes

Edits under `site/` belong in the **Alysum-Web** repo (branch + PR there). Then update the submodule pointer in this repo:

```bash
cd site
git checkout main && git pull
# … make changes, commit, push to Alysum-Web …
cd ..
git add site
git commit -m "Bump site submodule for …"
```

## Download & share (friends)

- In the app: open **Download for Windows · Share with a friend** on the sign-in screen, or go to `/desktop/download.html`.
- Public link (after you publish a release): [Latest release](https://github.com/Cyrene-RPG/Alysum-Desktop/releases/latest)

### Publish a new installer

```bash
npm run release:win
# Installer: dist/Alysum-Setup-<version>.exe
```

Upload that file to [GitHub Releases](https://github.com/Cyrene-RPG/Alysum-Desktop/releases/new), **or** tag a version and let CI build it:

```bash
git tag v1.1.0
git push origin v1.1.0
```

## Requirements

- Node.js 18+
- Windows (primary build target; `dist:win`)
