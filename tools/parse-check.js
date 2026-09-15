const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dir = "c:/xampp/htdocs/ar_shooter_game/assets/js";
for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".js"))) {
  const r = spawnSync("node", ["--check", path.join(dir, f)], { encoding: "utf8" });
  if (r.status !== 0) console.log("FAIL", f, r.stderr);
}
const vendor = [
  "c:/xampp/htdocs/ar_shooter_game/assets/vendor/es-module-shims.js",
  "c:/xampp/htdocs/ar_shooter_game/assets/vendor/mindar/mindar-image-three.prod.js",
  "c:/xampp/htdocs/ar_shooter_game/assets/vendor/three/examples/jsm/loaders/GLTFLoader.js",
];
for (const f of vendor) {
  const r = spawnSync("node", ["--check", f], { encoding: "utf8" });
  console.log(r.status === 0 ? "OK" : "FAIL", path.basename(f), (r.stderr || "").slice(0, 200));
}
