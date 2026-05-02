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

          // framer-motion 12+ ships its core as `motion-dom` +
          // `motion-utils`, so a substring match on "framer-motion"
          // alone leaks ~50 KB of motion code into the generic
          // `vendor` chunk. Match all three so the entire animation
          // runtime is co-located in one route-lazy chunk.
          if (
            id.includes("framer-motion") ||
            id.includes("motion-dom") ||
            id.includes("motion-utils")
          ) {
            return "motion-vendor";
          }

          // Recharts + d3 belong on /stats only — pulled out so the
          // home critical path never ships them.
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts-vendor";
          }

          // Domain-isolated vendor chunks. Splitting these out of the
          // generic `vendor` bag is what brings the home initial JS
          // payload below the 250 KB target: each route now only
          // pulls the chunks it actually imports, instead of dragging
          // the entire ecosystem along with the entry bundle.
          //
          // - supabase-vendor: only loaded by features that talk to
          //   Supabase (Sleep Mode session sync, optional cloud
          //   bookmarks). Home shell never touches it.
          // - query-vendor: TanStack Query / Virtual — used by Quran
          //   reader and Hifz; not on home.
          // - router-vendor: react-router-dom + @remix-run/router +
          //   history. Imported by the entry chunk, but isolated so
          //   it doesn't drag along everything else with it.
          // - radix-vendor: @radix-ui/* primitives — only loaded
          //   transitively by Settings / dialogs / sheets.
          // - icons-vendor: lucide-react. The home tab bar uses a
          //   handful of icons, so this DOES land on the entry path,
          //   but isolating it lets the SW precache it once and
          //   share it across every route.
          // - form-vendor: react-hook-form + @hookform/* + zod.
          //   Used by Settings forms; not on home.
          // - date-vendor: date-fns — Hifz / streaks only.
          // - storage-vendor: idb — Quran reader / offline; not home.
          // - misc-vendor: small leaf libs that only the home shell
          //   needs (sonner toast, clsx, tailwind-merge, embla, etc.)
          // `iceberg-js` ships as a transitive dep of @supabase/realtime;
          // group it with supabase so home doesn't pay for realtime.
          if (id.includes("@supabase") || id.includes("iceberg-js")) {
            return "supabase-vendor";
          }
          if (id.includes("@tanstack")) return "query-vendor";
          if (
            id.includes("react-router") ||
            id.includes("@remix-run/router") ||
            /[\\/]node_modules[\\/]history[\\/]/.test(id)
          ) {
            return "router-vendor";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("@floating-ui") ||
            id.includes("cmdk") ||
            id.includes("vaul")
          ) {
            return "radix-vendor";
          }
          if (id.includes("lucide-react")) return "icons-vendor";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            /[\\/]node_modules[\\/]zod[\\/]/.test(id)
          ) {
            return "form-vendor";
          }
          if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) {
            return "date-vendor";
          }
          if (/[\\/]node_modules[\\/]idb[\\/]/.test(id)) {
            return "storage-vendor";
          }

          // react-day-picker is only loaded by Settings (download
          // calendar) and Ramadan / Hifz date pickers — never by the
          // home shell. Pulling it out of `vendor` keeps the home
          // critical path under the 250 KB JS budget.
          if (id.includes("react-day-picker")) return "datepicker-vendor";

          // Embla carousel — only used by the install-guide modal and
          // the onboarding tour. Lazy on every other route.
          if (id.includes("embla-carousel")) return "carousel-vendor";

          // Workbox runtime helpers — bundled with the registration
          // shim, but the underlying SW lives in dist/sw.js so the
          // main thread only needs the small `workbox-window` slice.
          if (id.includes("workbox-")) return "workbox-vendor";

          // DevKit-only panels primitive.
          if (id.includes("react-resizable-panels")) return "panels-vendor";

          // Everything else (sonner, clsx, tailwind-merge,
          // tailwindcss-animate, class-variance-authority, web-vitals,
          // next-themes, input-otp, etc.) lands here. These are all
          // small leaf libs that the home shell legitimately needs.
          return "vendor";
        },
      },
    },
  },
}));
