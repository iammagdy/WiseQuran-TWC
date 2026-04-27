import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";
import PageTransition from "./PageTransition";
import GlobalAudioBar from "@/components/quran/GlobalAudioBar";
import { AchievementUnlockNotification } from "@/components/AchievementsSheet";
import { useAudioPlayerState } from "@/contexts/AudioPlayerContext";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const location = useLocation();
  const { surahNumber } = useAudioPlayerState();
  const onSurahPage = location.pathname.startsWith("/surah/");
  const isRecitationTest = location.pathname === "/hifz/test";
  const showGlobalBar = surahNumber !== null && !onSurahPage && !isRecitationTest;

  useTheme();

  return (
    <div className="min-h-screen bg-background gradient-spiritual pattern-islamic bg-blend-normal">
      <OfflineBanner />
      <main className={showGlobalBar ? "pb-nav-with-bar" : "pb-nav"}>
        <div className="max-w-lg mx-auto w-full overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <PageTransition key={location.key}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
      <AnimatePresence>
        {showGlobalBar && <GlobalAudioBar />}
      </AnimatePresence>
      <BottomNav />
      <AchievementUnlockNotification />
    </div>
  );
}
