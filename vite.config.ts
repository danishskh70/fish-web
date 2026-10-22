/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    headers: { "Cache-Control": "no-store" },
    proxy: { "/api": "http://localhost:8000" },
  },
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react-router-dom", "@tanstack/react-query"],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "FishSeed Manager",
        short_name: "FishSeed",
        start_url: "/",
        display: "standalone",
        background_color: "#0b7a5f",
        theme_color: "#0b7a5f",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        // Never cache API: bills and rates stay off disk.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
  },
});
