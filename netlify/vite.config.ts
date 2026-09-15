import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

export default defineConfig({
  root: here,
  publicDir: path.resolve(projectRoot, "public"),
  plugins: [react()],
  resolve: { alias: { "@": projectRoot } },
  build: {
    outDir: path.resolve(projectRoot, "dist-netlify"),
    emptyOutDir: true,
  },
});
