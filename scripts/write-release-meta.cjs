const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const meta = {
  version: pkg.version,
  productName: pkg.build?.productName || pkg.productName || "Alysum",
  githubOwner: "Cyrene-RPG",
  githubRepo: "Alysum-Desktop",
  releasePage: "https://github.com/Cyrene-RPG/Alysum-Desktop/releases/latest",
  assetPrefix: "Alysum-Setup-",
};

fs.writeFileSync(path.join(root, "desktop-ui", "release-meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log("[alysum-desktop] release-meta.json → v" + meta.version);
