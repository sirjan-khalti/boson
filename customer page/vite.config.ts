import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    hmr: false,
    allowedHosts: ["careers.khalti.com", "recruiters.khalti.com"],
    proxy: {
      "/api": {
        target: "http://khalti-careers-api:8000",
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ["**/*"],
    },
  },
});
