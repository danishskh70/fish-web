import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Phone/browser talks to Vite on one origin. Vite forwards /api to FastAPI, so cookies and CORS just work.
const target = process.env.VITE_API_PROXY ?? "http://localhost:8000";
const proxy = { "/api": { target, changeOrigin: true } };

export default defineConfig({
  server: { proxy },
  preview: { proxy },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"],
      manifest: {
        name: "MatsyaSetu",
        short_name: "MatsyaSetu",
        description: "Fish seed distribution: trips, handovers and payments",
        theme_color: "#0b2a5b",
        background_color: "#eef3fb",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ],
        shortcuts: [
          { name: "Active trip", url: "/trips/active", icons: [{ src: "icon-192.png", sizes: "192x192" }] },
          { name: "Customers", url: "/customers", icons: [{ src: "icon-192.png", sizes: "192x192" }] }
        ]
      },
      // No runtime caching of API responses: money data is never served from a stale cache.
      workbox: { runtimeCaching: [], navigateFallback: "/index.html" }
    })
  ],
  test: { environment: "node", include: ["src/**/*.test.ts"] }
});
