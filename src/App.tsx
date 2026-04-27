import { useState, useCallback, useEffect, lazy, Suspense } from "react";
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
import { usePostUpdateChangelog } from "@/hooks/usePostUpdateChangelog";

const prefetchTopTabs = () => {
  import("@/pages/QuranPage");
  import("@/pages/PrayerPage");
  import("@/pages/AzkarPage");
  import("@/pages/TasbeehPage");
  // Settings is accessed frequently but is a large chunk — prefetch while idle
  import("@/pages/SettingsPage");
};

const QuranPage = lazy(() => import("@/pages/QuranPage"));
const SurahReaderPage = lazy(() => import("@/pages/SurahReaderPage"));
const AzkarPage = lazy(() => import("@/pages/AzkarPage"));
const PrayerPage = lazy(() => import("@/pages/PrayerPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const SafariDiagnosticsPage = lazy(() => import("@/pages/SafariDiagnosticsPage"));
const TasbeehPage = lazy(() => import("@/pages/TasbeehPage"));
const StatsPage = lazy(() => import("@/pages/StatsPage"));
const HifzPage = lazy(() => import("@/pages/HifzPage"));
const RecitationTestPage = lazy(() => import("@/pages/RecitationTestPage"));
const QiblaPage = lazy(() => import("@/pages/QiblaPage"));
const OfflineCenterPage = lazy(() => import("@/pages/OfflineCenterPage"));
const FridayModePage = lazy(() => import("@/pages/FridayModePage"));
const RamadanPage = lazy(() => import("@/pages/RamadanPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const SleepModePage = lazy(() => import("@/pages/SleepModePage"));
const DevKitPage = lazy(() => import("@/pages/DevKitPage"));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
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
        idleId = window.requestIdleCallback(prefetchTopTabs);
      } else {
        prefetchTopTabs();
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
