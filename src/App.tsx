import { useState, useCallback, useEffect, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig, useReducedMotion } from "framer-motion";
import AppShell from "@/components/layout/AppShell";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import InstallBanner from "@/components/InstallBanner";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import ChangelogModal from "@/components/ChangelogModal";
import UpdateNotification from "@/components/UpdateNotification";
import SplashScreen from "@/components/SplashScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazyWithRetry } from "@/lib/lazy-with-retry";
import { usePostUpdateChangelog } from "@/hooks/usePostUpdateChangelog";

// Eagerly resolve EVERY lazy route while the app is idle, so the
// service worker has a chance to populate its runtime cache and the
// PWA is fully usable on the very next offline launch (iOS standalone
// PWAs in particular are commonly opened offline as their first run
// after install). Each import is awaited best-effort; failures are
// silent because the app still works without the prefetch.
const prefetchAllRoutes = () => {
  void import("@/pages/QuranPage").catch(() => {});
  void import("@/pages/PrayerPage").catch(() => {});
  void import("@/pages/AzkarPage").catch(() => {});
  void import("@/pages/TasbeehPage").catch(() => {});
  void import("@/pages/SettingsPage").catch(() => {});
  void import("@/pages/SurahReaderPage").catch(() => {});
  void import("@/pages/SafariDiagnosticsPage").catch(() => {});
  void import("@/pages/StatsPage").catch(() => {});
  void import("@/pages/HifzPage").catch(() => {});
  void import("@/pages/RecitationTestPage").catch(() => {});
  void import("@/pages/QiblaPage").catch(() => {});
  void import("@/pages/OfflineCenterPage").catch(() => {});
  void import("@/pages/FridayModePage").catch(() => {});
  void import("@/pages/RamadanPage").catch(() => {});
  void import("@/pages/NotFound").catch(() => {});
  void import("@/pages/SleepModePage").catch(() => {});
  void import("@/pages/DevKitPage").catch(() => {});
  void import("@/pages/BookmarksPage").catch(() => {});
};

const QuranPage = lazyWithRetry(() => import("@/pages/QuranPage"), "QuranPage");
const SurahReaderPage = lazyWithRetry(() => import("@/pages/SurahReaderPage"), "SurahReaderPage");
const AzkarPage = lazyWithRetry(() => import("@/pages/AzkarPage"), "AzkarPage");
const PrayerPage = lazyWithRetry(() => import("@/pages/PrayerPage"), "PrayerPage");
const SettingsPage = lazyWithRetry(() => import("@/pages/SettingsPage"), "SettingsPage");
const SafariDiagnosticsPage = lazyWithRetry(() => import("@/pages/SafariDiagnosticsPage"), "SafariDiagnosticsPage");
const TasbeehPage = lazyWithRetry(() => import("@/pages/TasbeehPage"), "TasbeehPage");
const StatsPage = lazyWithRetry(() => import("@/pages/StatsPage"), "StatsPage");
const HifzPage = lazyWithRetry(() => import("@/pages/HifzPage"), "HifzPage");
const RecitationTestPage = lazyWithRetry(() => import("@/pages/RecitationTestPage"), "RecitationTestPage");
const QiblaPage = lazyWithRetry(() => import("@/pages/QiblaPage"), "QiblaPage");
const OfflineCenterPage = lazyWithRetry(() => import("@/pages/OfflineCenterPage"), "OfflineCenterPage");
const FridayModePage = lazyWithRetry(() => import("@/pages/FridayModePage"), "FridayModePage");
const RamadanPage = lazyWithRetry(() => import("@/pages/RamadanPage"), "RamadanPage");
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"), "NotFound");
const SleepModePage = lazyWithRetry(() => import("@/pages/SleepModePage"), "SleepModePage");
const DevKitPage = lazyWithRetry(() => import("@/pages/DevKitPage"), "DevKitPage");
const BookmarksPage = lazyWithRetry(() => import("@/pages/BookmarksPage"), "BookmarksPage");
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications";
import { useAzkarNotifications } from "@/hooks/useAzkarNotifications";
import { useAdhan } from "@/hooks/useAdhan";
import { usePrayerReminders } from "@/hooks/usePrayerReminders";
import { usePrayerCheckoffReminders } from "@/hooks/usePrayerCheckoffReminders";
import { useGlobalAudioBootstrap } from "@/hooks/useGlobalAudioBootstrap";
import { useFridayReminders } from "@/hooks/useFridayReminders";
import { SyncQueueProvider } from "@/contexts/SyncQueueContext";

const queryClient = new QueryClient();

const AppContent = () => {
  useGlobalAudioBootstrap();
  usePrayerNotifications();
  useAzkarNotifications();
  useAdhan();
  usePrayerReminders();
  usePrayerCheckoffReminders();
  useFridayReminders();
  // When the OS requests reduced motion, flatten every framer-motion
  // transition globally so route/page/spring animations stop before
  // they ever run. Pairs with the CSS media query in index.css for
  // non-framer animations/transitions.
  const prefersReducedMotion = useReducedMotion();
  const { showChangelog, newEntries, dismissTemporary, dismissPermanent } = usePostUpdateChangelog();
  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }>
      <Routes>
        <Route path="/sleep" element={<SleepModePage />} />
        <Route path="/devkit" element={<DevKitPage />} />
        <Route
          path="*"
          element={
            <>
              <AppShell>
                <Routes>
                  <Route path="/" element={<QuranPage />} />
                  <Route path="/surah/:id" element={<SurahReaderPage />} />
                  <Route path="/azkar" element={<AzkarPage />} />
                  <Route path="/prayer" element={<PrayerPage />} />
                  <Route path="/tasbeeh" element={<TasbeehPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/hifz" element={<HifzPage />} />
                  <Route path="/hifz/test" element={<RecitationTestPage />} />
                  <Route path="/qibla" element={<QiblaPage />} />
                  <Route path="/friday" element={<FridayModePage />} />
                  <Route path="/ramadan" element={<RamadanPage />} />
                  <Route path="/offline" element={<OfflineCenterPage />} />
                  <Route path="/bookmarks" element={<BookmarksPage />} />
                  <Route path="/settings/safari-diagnostics" element={<SafariDiagnosticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppShell>
              <InstallBanner />
              <MaintenanceBanner />
              <UpdateNotification />
            </>
          }
        />
      </Routes>
      </Suspense>
      <ChangelogModal
        open={showChangelog}
        newEntries={newEntries}
        onDismissTemporary={dismissTemporary}
        onDismissPermanent={dismissPermanent}
      />
      </>
    </MotionConfig>
  );
};

const PREFETCH_DELAY_MS = 3000;

const App = () => {
  const [appReady, setAppReady] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setAppReady(true);
  }, []);

  useEffect(() => {
    if (!appReady) return;
    let idleId: number | undefined;
    const timerId = setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(prefetchAllRoutes);
      } else {
        prefetchAllRoutes();
      }
    }, PREFETCH_DELAY_MS);
    return () => {
      clearTimeout(timerId);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
    };
  }, [appReady]);

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} />
      {appReady && (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AuthProvider>
                <LanguageProvider>
                  <AudioPlayerProvider>
                    <SyncQueueProvider>
                      <ErrorBoundary>
                        <AppContent />
                      </ErrorBoundary>
                    </SyncQueueProvider>
                  </AudioPlayerProvider>
                </LanguageProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      )}
    </>
  );
};

export default App;
