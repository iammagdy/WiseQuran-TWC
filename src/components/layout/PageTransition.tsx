import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode, forwardRef } from "react";

const TAB_ORDER: Record<string, number> = {
  "/": 0,
  "/azkar": 1,
  "/prayer": 2,
  "/tasbeeh": 3,
  "/settings": 4,
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
  stiffness: 520,
  damping: 42,
  mass: 0.8,
};

const PageTransition = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function PageTransition({ children }, ref) {
    const location = useLocation();
    const currentPath = location.pathname;

    const currIdx = getTabIndex(currentPath);
    const isDetail = isDetailPage(currentPath);

    let variant: keyof typeof slideVariants = "fade";

    if (isDetail) {
      variant = "pushUp";
    } else if (currIdx !== -1) {
      variant = "enterFromRight";
    }

    const v = slideVariants[variant];

    return (
      <motion.div
        ref={ref}
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
);

export default PageTransition;
