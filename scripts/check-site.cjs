const fs = require("fs");
const path = require("path");

const siteRoot = path.join(__dirname, "..", "site");
const required = ["login.html", "writer-dashboard.html", "Alysum-3.png"];

for (const file of required) {
  const full = path.join(siteRoot, file);
  if (!fs.existsSync(full)) {
    console.error(`[alysum-desktop] Missing site/${file}. Run: git submodule update --init --recursive`);
    process.exit(1);
  }
}

console.log("[alysum-desktop] site/ submodule OK for packaging.");
