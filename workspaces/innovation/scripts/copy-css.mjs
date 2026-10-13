import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packageRoot = new URL("../", import.meta.url);
const source = fileURLToPath(new URL("src/ui/styles.css", packageRoot));
const outputDirectory = fileURLToPath(new URL("dist/ui/", packageRoot));
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(source, fileURLToPath(new URL("dist/ui/styles.css", packageRoot)));
