import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Electron 生产环境用 file:// 加载 dist/renderer/index.html，必须 base: './'
export default defineConfig({
  plugins: [vue()],
  base: "./",
  root: "src/renderer",
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
