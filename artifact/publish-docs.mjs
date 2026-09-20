// Copies the single-file build to docs/index.html so GitHub Pages can serve it
// ("Deploy from a branch" -> main -> /docs).
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const docs = join(here, "..", "docs");
mkdirSync(docs, { recursive: true });
copyFileSync(join(here, "dist", "artifact", "index.html"), join(docs, "index.html"));
writeFileSync(join(docs, ".nojekyll"), "");
console.log("Wrote docs/index.html");
