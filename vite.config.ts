import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  publicDir: false,
  server: { port: 8080 },
  build: { outDir: "public", emptyOutDir: true },
});
