import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isRamadanTabVisible } from "@/hooks/useRamadan";
import { useLanguage } from "@/contexts/LanguageContext";

function QuranIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6C2 5.45 2.45 5 3 5h8v14H3a1 1 0 0 1-1-1V6z" />
      <path d="M22 6c0-.55-.45-1-1-1h-8v14h8a1 1 0 0 0 1-1V6z" />
      <path d="M11 5v14" />
      <path d="M7 9h2M7 12h2M15 9h2M15 12h2" />
    </svg>
  );
}

function AzkarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V7a1 1 0 0 1 2 0v4" />
      <path d="M10 11V6a1 1 0 0 1 2 0v5" />
      <path d="M12 11V7a1 1 0 0 1 2 0v4" />
      <path d="M14 11v-2a1 1 0 0 1 2 0v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-3a1 1 0 0 1 2 0v2" />
    </svg>
  );
}

function MosqueIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
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
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3a3 3 0 0 1 3 3v10a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
      <path d="M6 3v2" />
      <path d="M3 8h6" />
      <path d="M3 11h6" />
      <path d="M3 14h6" />
      <path d="M15 3l1 3h4l-3 3 1 4-3-2-3 2 1-4-3-3h4z" />
    </svg>
  );
}

function RamadanIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
      <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={active ? 1.75 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const iconMap = {
  "/": QuranIcon,
  "/azkar": AzkarIcon,
  "/prayer": MosqueIcon,
  "/tasbeeh": TasbeehIcon,
  "/ramadan": RamadanIcon,
  "/settings": SettingsIcon,
} as const;

const basePaths = [
  { path: "/", key: "nav_quran" as const },
  { path: "/azkar", key: "nav_azkar" as const },
  { path: "/prayer", key: "nav_prayer" as const },
  { path: "/tasbeeh", key: "nav_tasbeeh" as const },
  { path: "/settings", key: "nav_settings" as const },
];

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const showRamadan = useMemo(() => isRamadanTabVisible(), []);

  const tabs = useMemo(() => {
    if (!showRamadan) return basePaths;
    return [
      ...basePaths.slice(0, -1),
      { path: "/ramadan", key: "nav_ramadan" as const },
      basePaths[basePaths.length - 1],
    ];
  }, [showRamadan]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="nav-floating glass-subtle border-t border-border/40">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2" style={{ height: 'var(--nav-height)' }}>
          {tabs.map(({ path, key }) => {
            const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
            const IconComponent = iconMap[path as keyof typeof iconMap];
            return (
              <NavLink
                key={path}
                to={path}
                className="relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[52px]"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}

                <motion.div
                  animate={{
                    scale: isActive ? 1.08 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  whileTap={{ scale: 0.78 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative z-10"
                >
                  {IconComponent && (
                    <div
                      className={cn(
                        "transition-all duration-200",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      style={{
                        filter: isActive ? "drop-shadow(0 0 6px hsl(var(--primary) / 0.45))" : "none"
                      }}
                    >
                      <IconComponent active={isActive} />
                    </div>
                  )}
                </motion.div>

                <motion.span
                  animate={{ opacity: isActive ? 1 : 0.65 }}
                  className={cn(
                    "relative z-10 text-[11px] font-semibold transition-all duration-200 leading-none",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {t(key)}
                </motion.span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
