import { useState, useCallback } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import InstallBanner from "@/components/InstallBanner";
import SaveProgressBanner from "@/components/SaveProgressBanner";
import SplashScreen from "@/components/SplashScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import QuranPage from "@/pages/QuranPage";
import SurahReaderPage from "@/pages/SurahReaderPage";
import AzkarPage from "@/pages/AzkarPage";
import PrayerPage from "@/pages/PrayerPage";
import SettingsPage from "@/pages/SettingsPage";
import TasbeehPage from "@/pages/TasbeehPage";
import StatsPage from "@/pages/StatsPage";
import HifzPage from "@/pages/HifzPage";
import RecitationTestPage from "@/pages/RecitationTestPage";
import QiblaPage from "@/pages/QiblaPage";
import RamadanPage from "@/pages/RamadanPage";
import NotFound from "@/pages/NotFound";
import SignInPage from "@/pages/SignInPage";
import { usePrayerNotifications } from "@/hooks/usePrayerNotifications";
import { useAzkarNotifications } from "@/hooks/useAzkarNotifications";
import { useAdhan } from "@/hooks/useAdhan";
import { usePrayerReminders } from "@/hooks/usePrayerReminders";

const queryClient = new QueryClient();

const AppContent = () => {
  usePrayerNotifications();
  useAzkarNotifications();
  useAdhan();
  usePrayerReminders();
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
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
                <Route path="/ramadan" element={<RamadanPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
            <InstallBanner />
            <SaveProgressBanner />
          </>
        }
      />
    </Routes>
  );
};

const App = () => {
  const [appReady, setAppReady] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setAppReady(true);
  }, []);

  return (
    <>
      <SplashScreen onComplete={handleSplashComplete} />
      {appReady && (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <LanguageProvider>
                  <AudioPlayerProvider>
                    <ErrorBoundary>
                      <AppContent />
                    </ErrorBoundary>
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
