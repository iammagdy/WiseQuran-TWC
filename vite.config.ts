import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon.png", "favicon-16x16.png", "icons/*.png", "placeholder.svg"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.quran\.com\/api\/v4\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quran-foundation-api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/download\.quranicaudio\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "quranic-audio-cache",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.mp3quran\.net\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mp3quran-audio-cache",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.islamic\.network\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "adhan-audio-cache",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/assets\.mixkit\.co\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "chime-audio-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false,
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
