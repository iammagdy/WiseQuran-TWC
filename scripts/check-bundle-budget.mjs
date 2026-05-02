#!/usr/bin/env node
// Bundle-size budget guard.
//
// Reads the Vite build output in `dist/assets/*.js`, computes the gzipped
// size of each chunk, and fails the build if any tracked chunk exceeds its
// documented budget. Run AFTER `pnpm run build`.
//
// To update a budget: ship the optimization first, observe the new number
// reported by this script, then bump the threshold in BUDGETS_KB with a
// short PR comment explaining the why.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

// Budgets are gzipped sizes in kilobytes (1024 bytes). Each entry is the
// stable prefix of the chunk filename (Vite appends a hash). Numbers here
// are the *ceiling*, set ~30% above the current measured size so normal
// growth doesn't trip the alarm but a regression of 100KB+ does.
const BUDGETS_KB = {
  // Main entry — currently ~74 KB gzipped after Task #13.
  "index": 100,
  // Generic catch-all for small leaf libs (sonner, clsx, web-vitals,
  // tslib, next-themes, etc.) the home shell needs. Heavy ecosystems
  // are isolated into their own *-vendor chunks below — if this
  // creeps back up it usually means a new dep slipped in without a
  // matchChunks rule, OR an existing matcher stopped catching a
  // transitive dep (motion-utils / iceberg-js have done this before).
  "vendor": 75,
  // React core only (react / react-dom / scheduler). react-router
  // intentionally lives in router-vendor; see vite.config.ts.
  "react-vendor": 60,
  // react-router-dom + @remix-run/router + history.
  "router-vendor": 15,
  // framer-motion + motion-dom + motion-utils. The matcher must
  // catch all three or the motion runtime fragments back into vendor.
  "motion-vendor": 55,
  // @radix-ui/* + @floating-ui/* + cmdk + vaul. Settings / dialogs.
  "radix-vendor": 50,
  // @supabase/* + iceberg-js (transitive realtime dep). Lazy on
  // Sleep Mode + cloud bookmarks; never on home.
  "supabase-vendor": 65,
  // @tanstack/react-query + react-virtual. Quran reader / Hifz only.
  "query-vendor": 25,
  // lucide-react. Home tab bar uses a handful of icons.
  "icons-vendor": 20,
  // recharts + d3-*. Lazy-loaded by /stats only.
  "charts-vendor": 110,
  // idb. Quran reader / offline only.
  "storage-vendor": 5,
  // embla-carousel-react. Onboarding / install guide only.
  "carousel-vendor": 15,
  // workbox-window registration shim. Only the SW registrar pulls
  // this in.
  "workbox-vendor": 5,
  //
  // CHUNKS INTENTIONALLY UNTRACKED:
  // - `form-vendor` (react-hook-form + @hookform/* + zod): Rollup
  //   inlines this into SettingsPage when no other route imports the
  //   form stack, so a separate chunk is not always emitted. The
  //   SettingsPage budget already caps the combined size.
  // - `date-vendor` (date-fns), `datepicker-vendor` (react-day-picker),
  //   `panels-vendor` (react-resizable-panels): same story — only
  //   one route consumer each, so Rollup may co-locate them in the
  //   route chunk rather than emit a standalone vendor chunk. They
  //   are still routed through their own manualChunks rules in
  //   vite.config.ts so they CAN be split out if a second consumer
  //   appears, but until then there is no separate chunk to budget.
  // If a future build emits these chunks separately they should be
  // added here with budgets sized ~30% above their measured size.
};

const DIST_ASSETS = join(process.cwd(), "dist", "assets");

function listChunks() {
  let entries;
  try {
    entries = readdirSync(DIST_ASSETS);
  } catch (err) {
    console.error(`✖ Could not read ${DIST_ASSETS}. Did you run \`pnpm run build\` first?`);
    console.error(`  ${err.message}`);
    process.exit(2);
  }
  const out = [];
  for (const name of entries) {
    if (!name.endsWith(".js") || name.endsWith(".map")) continue;
    const path = join(DIST_ASSETS, name);
    if (!statSync(path).isFile()) continue;
    out.push({ name, path });
  }
  return out;
}

function gzippedKb(path) {
  const raw = readFileSync(path);
  return gzipSync(raw).length / 1024;
}

function matchBudget(name) {
  // Vite emits names like `index-DAIkdQ_V.js` or
  // `charts-vendor-Bi-1TRau.js`. Vite hashes are base64url-style and
  // CAN contain hyphens, so a regex like `/-[A-Za-z0-9_]+\.js$/`
  // will silently fail to strip the full hash on those filenames
  // (it'd leave `charts-vendor-Bi`), causing the budget lookup to
  // miss and the chunk to bypass enforcement.
  //
  // Match against known budget keys instead: if the filename starts
  // with `<key>-` and ends with `.js`, that's the budget that applies.
  // We pick the LONGEST matching key so that `data-vendor-...` would
  // correctly bind to `data-vendor`, not the shorter `data` if both
  // existed.
  if (!name.endsWith(".js")) return null;
  let best = null;
  for (const key of Object.keys(BUDGETS_KB)) {
    if (name.startsWith(key + "-")) {
      if (!best || key.length > best.length) best = key;
    }
  }
  return best;
}

const chunks = listChunks();
if (chunks.length === 0) {
  console.error("✖ No JS chunks found in dist/assets — build output is missing.");
  process.exit(2);
}

const rows = [];
let hardFail = false;

for (const c of chunks) {
  const sizeKb = gzippedKb(c.path);
  const budgetName = matchBudget(c.name);
  const budget = budgetName ? BUDGETS_KB[budgetName] : null;
  const overBudget = budget != null && sizeKb > budget;
  if (overBudget) hardFail = true;
  rows.push({ name: c.name, sizeKb, budgetName, budget, overBudget });
}

rows.sort((a, b) => b.sizeKb - a.sizeKb);

console.log("Bundle size report (gzipped):");
console.log("─".repeat(70));
for (const r of rows) {
  const size = r.sizeKb.toFixed(2).padStart(8) + " KB";
  if (r.budget != null) {
    const status = r.overBudget ? "✖ OVER" : "✓ ok";
    console.log(`  ${size}   ${r.name}   [budget ${r.budget} KB] ${status}`);
  } else {
    console.log(`  ${size}   ${r.name}`);
  }
}
console.log("─".repeat(70));

if (hardFail) {
  console.error("");
  console.error("✖ Bundle budget exceeded. Either:");
  console.error("  1. Find what bloated the chunk (check recent imports / new deps).");
  console.error("  2. If the increase is justified, raise the budget in scripts/check-bundle-budget.mjs");
  console.error("     with a comment explaining why.");
  process.exit(1);
}

console.log("✓ All tracked chunks are within budget.");
