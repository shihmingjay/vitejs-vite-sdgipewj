import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/twse": {
        target: "https://openapi.twse.com.tw",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/twse/, ""),
      },
    },
  },
});