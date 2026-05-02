// Tiny gated logger. In production builds (import.meta.env.DEV === false)
// `debug`/`log`/`info` are hard-disabled so stray diagnostic noise never
// reaches the user's browser console. `warn` and `error` still surface
// so real failures stay visible — but they also get routed through a
// single chokepoint so we can add reporters (Sentry, analytics) later
// without touching call sites again.
//
// Call sites should prefer:
//   import { logger } from "@/lib/logger";
//   logger.debug("something", value);
// over bare `console.log(...)`.

type LogArgs = readonly unknown[];

const IS_DEV: boolean =
  typeof import.meta !== "undefined" && !!(import.meta as ImportMeta).env?.DEV;

function dev(method: "log" | "debug" | "info", args: LogArgs): void {
  if (!IS_DEV) return;
  console[method](...args);
}

export const logger = {
  log: (...args: LogArgs) => dev("log", args),
  debug: (...args: LogArgs) => dev("debug", args),
  info: (...args: LogArgs) => dev("info", args),
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};

export default logger;
