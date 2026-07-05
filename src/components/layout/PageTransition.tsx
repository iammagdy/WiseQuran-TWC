import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode, useRef } from "react";

const TAB_ORDER: Record<string, number> = {
  "/": 0,
  "/azkar": 1,
  "/prayer": 2,
  "/tasbeeh": 3,
  "/ramadan": 4,
  "/settings": 5,
};

const DETAIL_ROUTES = ["/surah/", "/hifz/test", "/stats", "/qibla"];

function getTabIndex(pathname: string): number {
  if (TAB_ORDER[pathname] !== undefined) return TAB_ORDER[pathname];
  for (const [path, idx] of Object.entries(TAB_ORDER)) {
    if (pathname.startsWith(path) && path !== "/") return idx;
  }
  return -1;
}

function isDetailPage(pathname: string): boolean {
  return DETAIL_ROUTES.some((r) => pathname.startsWith(r));
}

const slideVariants = {
  enterFromRight: {
    initial: { x: "40%", opacity: 0, scale: 0.97 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: "-25%", opacity: 0, scale: 0.98 },
  },
  enterFromLeft: {
    initial: { x: "-40%", opacity: 0, scale: 0.97 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: "25%", opacity: 0, scale: 0.98 },
  },
  pushUp: {
    initial: { y: "30%", opacity: 0, scale: 0.97 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: "-10%", opacity: 0, scale: 0.98 },
  },
  popDown: {
    initial: { y: "-5%", opacity: 0, scale: 0.98 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: "30%", opacity: 0, scale: 0.97 },
  },
  fade: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
};

const transition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 38,
  mass: 0.8,
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const prevPath = prevPathRef.current;
  const currentPath = location.pathname;

  const prevIdx = prevPath ? getTabIndex(prevPath) : -1;
  const currIdx = getTabIndex(currentPath);
  const isDetail = isDetailPage(currentPath);
  const wasDetail = prevPath ? isDetailPage(prevPath) : false;

  let variant: keyof typeof slideVariants;

  if (isDetail && !wasDetail) {
    variant = "pushUp";
  } else if (!isDetail && wasDetail) {
    variant = "popDown";
  } else if (prevIdx === -1 || currIdx === -1) {
    variant = "fade";
  } else if (currIdx > prevIdx) {
    variant = "enterFromRight";
  } else if (currIdx < prevIdx) {
    variant = "enterFromLeft";
  } else {
    variant = "fade";
  }

  prevPathRef.current = currentPath;

  const v = slideVariants[variant];

  return (
    <motion.div
      key={location.key}
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={transition}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
