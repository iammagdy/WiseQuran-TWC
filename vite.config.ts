import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import imageVariants from "./scripts/vite-image-variants-plugin.mjs";
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    // Phase D: emit AVIF/WebP siblings for static raster assets in
    // `public/` at build start so the install modal (and any future
    // <picture> consumer) can serve modern formats with PNG/JPG
    // fallbacks. Re-runs are no-ops once outputs are up-to-date.
    imageVariants(),
    react(),
    VitePWA({
      // Phase C: switched from generateSW to injectManifest so the
      // adhan + Friday reminder scheduler, Background Sync, and
      // Periodic Background Sync hooks live in a first-class TS
      // source file (`src/sw.ts`) instead of being grafted onto the
      // generated SW via `importScripts`.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "favicon.png", "favicon-16x16.png", "icons/*.png", "placeholder.svg"],
      injectManifest: {
        // App shell + entry/vendor chunks AND lazy route chunks must
        // all live in the precache so the PWA boots offline on the
        // very first launch after install (iOS Safari frequently
        // serves the standalone PWA as its first run, with no warm
        // network round-trip available). Anything that's not in the
        // precache is still served from the runtime SWR/CacheFirst
        // routes registered in `src/sw.ts` — but those caches don't
        // exist on a cold install, so the precache is the only thing
        // that guarantees first-run offline.
        //
        // Audio stays out of precache (persisted into IDB by
        // `src/lib/quran-audio.ts`) and install-guide screenshots
        // stay out (cosmetic, large).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: [
          "**/audio/**",
          "**/screenshots/**",
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
  build: {
    // Don't ship JS source maps to end users. In production builds we
    // still generate "hidden" maps so uploaded Sentry/Supabase logs
    // can be symbolicated out-of-band, but browsers will never fetch
    // them. Dev builds (`pnpm run dev`) keep default inline maps.
    sourcemap: mode === "production" ? "hidden" : true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core only (NOT react-router). Pulled out of the
          // generic vendor chunk so the home critical path doesn't
          // ship the rest of the ecosystem just to render the splash
          // + tab bar. Stable chunk name → SW precache manifest stays
          // deterministic.
          //
          // We deliberately leave react-router in `vendor`: it
          // depends on `@remix-run/router`, which itself doesn't get
          // matched by the patterns above. Pulling react-router into
          // react-vendor would create the bundling cycle
          //   vendor → react-vendor (vendor libs import React)
          //   react-vendor → vendor (@remix-run/router lives there)
          // and Rollup logs that as a "Circular chunk" warning.
          // Keeping react/react-dom/scheduler isolated (none of which
          // import anything else) breaks the cycle.
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)
          ) {
            return "react-vendor";
          }

          if (id.includes("framer-motion")) {
            return "motion-vendor";
          }

          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) {
            return "ui-vendor";
          }

          if (id.includes("@supabase") || id.includes("@tanstack") || id.includes("idb")) {
            return "data-vendor";
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts-vendor";
          }

          return "vendor";
        },
      },
    },
  },
}));
