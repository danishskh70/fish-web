/// <reference types="vitest" />
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const builtOn = new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(`${pkg.version} (${builtOn})`) },
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
      // Prompt mode: a new version waits until the user taps Update. Never reloads mid-work.
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png", "icon.svg"],
      manifest: {
        id: "/",
        name: "FishSeed Manager",
        short_name: "FishSeed",
        description: "Plan trips, hand out fish seed bags, print slips and bills.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        categories: ["business", "productivity"],
        background_color: "#F5F8F6",
        theme_color: "#15803D",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only. Never cache API: bills and rates stay off disk.
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
