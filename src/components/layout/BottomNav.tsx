import { useTransition } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSyncQueueContext } from "@/contexts/SyncQueueContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

function QuranIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6C2 5.45 2.45 5 3 5h8v14H3a1 1 0 0 1-1-1V6z" />
      <path d="M22 6c0-.55-.45-1-1-1h-8v14h8a1 1 0 0 0 1-1V6z" />
      <path d="M11 5v14" />
      <path d="M7 9h2M7 12h2M15 9h2M15 12h2" />
    </svg>
  );
}

function AzkarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V7a1 1 0 0 1 2 0v4" />
      <path d="M10 11V6a1 1 0 0 1 2 0v5" />
      <path d="M12 11V7a1 1 0 0 1 2 0v4" />
      <path d="M14 11v-2a1 1 0 0 1 2 0v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-3a1 1 0 0 1 2 0v2" />
    </svg>
  );
}

function MosqueIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v2" />
      <path d="M12 4c-2.5 0-4 1.8-4 4v1H7a1 1 0 0 0-1 1v8h12v-8a1 1 0 0 0-1-1h-1V8c0-2.2-1.5-4-4-4z" />
      <path d="M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M3 18h18" />
      <path d="M3 21h18" />
      <path d="M4 18v-3" />
      <path d="M20 18v-3" />
    </svg>
  );
}

function TasbeehIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3a3 3 0 0 1 3 3v10a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M6 3v2" />
      <path d="M3 8h6" />
      <path d="M3 11h6" />
      <path d="M3 14h6" />
      <path d="M15 3l1 3h4l-3 3 1 4-3-2-3 2 1-4-3-3h4z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RamadanIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="icon-responsive" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    </svg>
  );
}

const BASE_ICON_MAP = {
  "/": QuranIcon,
  "/azkar": AzkarIcon,
  "/prayer": MosqueIcon,
  "/tasbeeh": TasbeehIcon,
  "/settings": SettingsIcon,
  "/ramadan": RamadanIcon,
} as const;

const corePaths = [
  { path: "/", key: "nav_quran" as const },
  { path: "/azkar", key: "nav_azkar" as const },
  { path: "/prayer", key: "nav_prayer" as const },
  { path: "/tasbeeh", key: "nav_tasbeeh" as const },
  { path: "/settings", key: "nav_settings" as const },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { t } = useLanguage();
  const { pendingCount } = useSyncQueueContext();
  const { ramadanTab } = useFeatureFlags();
  const showSyncBadge = isSupabaseConfigured && pendingCount > 0;

  const basePaths: { path: string; key: typeof corePaths[number]["key"]; label?: string }[] =
    ramadanTab
      ? [
          ...corePaths,
          { path: "/ramadan", key: "nav_settings" as const, label: "رمضان" },
        ]
      : corePaths;

  return (
    <nav
      aria-label="Primary"
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg"
      style={{
        // Lift the floating dock above the iOS home indicator. The
        // `0.75rem`/`1.5rem` base corresponds to the previous
        // `bottom-3` / `sm:bottom-6` Tailwind classes.
        bottom: "calc(var(--bottom-nav-gap, 0.75rem) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="glass-card rounded-[2rem] px-2 py-2 overflow-hidden border border-white/10 shadow-2xl">
        <div className="flex items-center justify-around" style={{ height: 'calc(var(--nav-height) * 0.85)' }}>
          {basePaths.map(({ path, key, label }) => {
            // Utility routes (`/devkit`, `/sleep`, `/hifz`) aren't first-class
            // tabs but they belong to a parent — light up the closest tab so
            // the dock never looks "homeless". `/sleep` and `/hifz` flow out
            // of the Quran home; `/devkit` lives under Settings.
            const pathname = location.pathname;
            const isActive =
              path === "/"
                ? pathname === "/" || pathname.startsWith("/sleep") || pathname.startsWith("/hifz")
                : path === "/settings"
                  ? pathname.startsWith("/settings") || pathname.startsWith("/devkit")
                  : pathname.startsWith(path);
            const IconComponent = BASE_ICON_MAP[path as keyof typeof BASE_ICON_MAP];
            return (
              <NavLink
                key={path}
                to={path}
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  startTransition(() => { navigate(path); });
                }}
                data-testid={`bottom-nav-link-${path === "/" ? "quran" : path.replace("/", "")}`}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-300 px-2 py-1.5 flex-1 min-w-0 max-w-[80px]",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-x-1 inset-y-1 rounded-[1.25rem] bg-primary/8 shadow-sm border border-primary/5"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="relative z-10"
                >
                  {IconComponent && (
                    <div
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-primary" : "text-muted-foreground/60"
                      )}
                      style={{
                        filter: isActive ? "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))" : "none"
                      }}
                    >
                      <IconComponent active={isActive} />
                    </div>
                  )}
                  {path === "/settings" && showSyncBadge && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-amber-500 border border-background animate-pulse z-20"
                      />
                      <span className="sr-only">{t("sync_indicator_label")}</span>
                    </>
                  )}
                </motion.div>

                <motion.span
                  animate={{ 
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1 : 0.95
                  }}
                  className={cn(
                    "relative z-10 text-[9px] sm:text-[10px] font-bold tracking-tight no-overflow uppercase mt-0.5",
                    isActive ? "text-primary" : "text-muted-foreground/50"
                  )}
                >
                  {label ?? t(key)}
                </motion.span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
