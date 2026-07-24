import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "maskable-icon-512x512.png"],
      manifest: {
        name: "SeenTasks — A Considered Day",
        short_name: "SeenTasks",
        description: "Human-centered AI task planning for calmer, more intentional days.",
        theme_color: "#faf9f5",
        background_color: "#faf9f5",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/app",
        categories: ["productivity", "lifestyle"],
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
      devOptions: { enabled: false },
    }),
  ],
});

