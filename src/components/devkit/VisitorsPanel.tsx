import { useEffect, useState } from "react";
import { DK } from "./devkit-utils";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface VisitorSession {
  id: string;
  session_id: string;
  ip: string;
  org: string;
  city: string;
  country: string;
  device: string;
  bookmarks_count: number;
  hifz_count: number;
  tasbeeh_count: number;
  session_duration_seconds: number;
  last_active_at: string;
  created_at: string;
  feature_metrics?: {
    pages?: Record<string, number>;
    actions?: Record<string, number>;
  };
}

const MOCK_SESSIONS_INITIAL: VisitorSession[] = [
  {
    id: "mock-1",
    session_id: "s-mock-1",
    ip: "8.8.8.8",
    org: "Google LLC",
    city: "Mountain View",
    country: "United States",
    device: "Windows / Chrome",
    bookmarks_count: 15,
    hifz_count: 3,
    tasbeeh_count: 120,
    session_duration_seconds: 450,
    last_active_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    feature_metrics: {
      pages: { quran: 18, reader: 12, prayer: 4, tasbeeh: 3, settings: 1 },
      actions: { play_audio: 8, open_tafsir: 3, click_wbw: 18, tasbeeh_click: 120 }
    }
  },
  {
    id: "mock-2",
    session_id: "s-mock-2",
    ip: "37.224.0.1",
    org: "Saudi Aramco",
    city: "Dhahran",
    country: "Saudi Arabia",
    device: "iOS / Safari",
    bookmarks_count: 4,
    hifz_count: 1,
    tasbeeh_count: 550,
    session_duration_seconds: 1200,
    last_active_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    feature_metrics: {
      pages: { quran: 35, reader: 25, azkar: 14, tasbeeh: 12, hifz: 8 },
      actions: { play_audio: 14, open_tafsir: 8, click_wbw: 32, tasbeeh_click: 550 }
    }
  },
  {
    id: "mock-3",
    session_id: "s-mock-3",
    ip: "20.112.250.1",
    org: "Microsoft Corporation",
    city: "Redmond",
    country: "United States",
    device: "MacOS / Chrome",
    bookmarks_count: 28,
    hifz_count: 6,
    tasbeeh_count: 0,
    session_duration_seconds: 3600,
    last_active_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
    feature_metrics: {
      pages: { quran: 52, reader: 45, prayer: 18, settings: 6, bookmarks: 5 },
      actions: { play_audio: 30, open_tafsir: 15, click_wbw: 80 }
    }
  },
  {
    id: "mock-4",
    session_id: "s-mock-4",
    ip: "163.121.12.1",
    org: "Telecom Egypt (TE)",
    city: "Giza",
    country: "Egypt",
    device: "Android / Samsung Browser",
    bookmarks_count: 0,
    hifz_count: 0,
    tasbeeh_count: 2450,
    session_duration_seconds: 300,
    last_active_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    feature_metrics: {
      pages: { quran: 8, reader: 4, tasbeeh: 25, sleep: 2 },
      actions: { click_wbw: 5, tasbeeh_click: 2450 }
    }
  },
  {
    id: "mock-5",
    session_id: "s-mock-5",
    ip: "104.22.4.1",
    org: "Cloudflare Inc.",
    city: "London",
    country: "United Kingdom",
    device: "MacOS / Safari",
    bookmarks_count: 8,
    hifz_count: 2,
    tasbeeh_count: 80,
    session_duration_seconds: 900,
    last_active_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    feature_metrics: {
      pages: { quran: 15, reader: 10, prayer: 6, settings: 3, qibla: 2 },
      actions: { play_audio: 4, open_tafsir: 1, click_wbw: 12, tasbeeh_click: 80 }
    }
  }
];

export default function VisitorsPanel() {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  const fetchSessions = async (isManual = false) => {
    if (isManual) setLoading(true);

    if (!isSupabaseConfigured) {
      setIsMock(true);
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSessions(prev => {
        if (prev.length === 0) {
          return MOCK_SESSIONS_INITIAL;
        }
        
        return prev.map(s => {
          const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const isSessionActive = s.last_active_at >= activeThreshold;
          
          if (isSessionActive) {
            const addedSeconds = isManual ? 5 : 15;
            const rand = Math.random();
            
            // Advance mock pages & action metrics
            const currentMetrics = s.feature_metrics || { pages: {}, actions: {} };
            const pages = { ...currentMetrics.pages };
            const actions = { ...currentMetrics.actions };

            // Update random page views
            if (rand > 0.4) {
              const activePage = rand > 0.8 ? "reader" : (rand > 0.6 ? "quran" : "tasbeeh");
              pages[activePage] = (pages[activePage] || 0) + 1;
            }

            // Update random events
            if (rand > 0.5) {
              if (rand > 0.85) {
                actions.play_audio = (actions.play_audio || 0) + 1;
              } else if (rand > 0.7) {
                actions.open_tafsir = (actions.open_tafsir || 0) + 1;
              } else if (rand > 0.55) {
                actions.click_wbw = (actions.click_wbw || 0) + 1;
              }
            }
            
            const tasbeehAdded = rand > 0.6 ? Math.floor(rand * 15) : 0;
            if (tasbeehAdded > 0) {
              actions.tasbeeh_click = (actions.tasbeeh_click || 0) + tasbeehAdded;
            }

            return {
              ...s,
              session_duration_seconds: s.session_duration_seconds + addedSeconds,
              last_active_at: new Date().toISOString(),
              bookmarks_count: rand > 0.9 ? s.bookmarks_count + 1 : s.bookmarks_count,
              tasbeeh_count: s.tasbeeh_count + tasbeehAdded,
              feature_metrics: { pages, actions }
            };
          }
          return s;
        });
      });
      
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase
        .from("visitor_analytics")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) {
        throw err;
      }

      setSessions(data || []);
      setError(null);
      setIsMock(false);
    } catch (e: any) {
      setError(e.message || "Failed to fetch analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSessions();
    const interval = setInterval(() => void fetchSessions(), 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const activeSessionsCount = sessions.filter(s => s.last_active_at >= activeThreshold).length;

  // Aggregate stats
  const totalVisitors = sessions.length;
  
  // Group by company (org)
  const orgCounts: Record<string, number> = {};
  sessions.forEach(s => {
    const org = s.org || "Unknown Company";
    orgCounts[org] = (orgCounts[org] || 0) + 1;
  });
  const topCompanies = Object.entries(orgCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalBookmarks = sessions.reduce((acc, s) => acc + (s.bookmarks_count || 0), 0);
  const totalHifz = sessions.reduce((acc, s) => acc + (s.hifz_count || 0), 0);
  const totalTasbeeh = sessions.reduce((acc, s) => acc + (s.tasbeeh_count || 0), 0);
  const avgDuration = sessions.length 
    ? Math.round(sessions.reduce((acc, s) => acc + (s.session_duration_seconds || 0), 0) / sessions.length)
    : 0;

  // Aggregate page views
  const pageViews: Record<string, number> = {
    quran: 0,
    reader: 0,
    azkar: 0,
    prayer: 0,
    tasbeeh: 0,
    hifz: 0,
    recitation_test: 0,
    qibla: 0,
    sleep: 0,
    ramadan: 0,
    settings: 0,
    bookmarks: 0,
  };

  const actionCounts: Record<string, number> = {
    play_audio: 0,
    open_tafsir: 0,
    click_wbw: 0,
    tasbeeh_click: 0,
  };

  sessions.forEach(s => {
    const metrics = s.feature_metrics;
    if (metrics) {
      if (metrics.pages) {
        Object.entries(metrics.pages).forEach(([p, val]) => {
          if (typeof val === "number") {
            pageViews[p] = (pageViews[p] || 0) + val;
          }
        });
      }
      if (metrics.actions) {
        Object.entries(metrics.actions).forEach(([a, val]) => {
          if (typeof val === "number") {
            actionCounts[a] = (actionCounts[a] || 0) + val;
          }
        });
      }
    }
  });

  const totalPageViews = Object.values(pageViews).reduce((a, b) => a + b, 0);

  const pageLabels: Record<string, string> = {
    quran: "Quran Main Page",
    reader: "Surah Reader",
    azkar: "Azkar Page",
    prayer: "Prayer Times",
    tasbeeh: "Tasbeeh Counter",
    hifz: "Hifz Progress",
    recitation_test: "Recitation Test",
    qibla: "Qibla Finder",
    sleep: "Sleep Mode Player",
    ramadan: "Ramadan Center",
    settings: "Settings Page",
    bookmarks: "Bookmarks",
    other: "Other Pages"
  };

  const sortedPages = Object.entries(pageViews)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      {/* Mock Mode Alert */}
      {isMock && (
        <div className="bg-[#1f1b11] border border-[#f1e05a]/30 text-[#f1e05a] text-xs font-mono px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>⚠️ Running in <strong>Preview Mode</strong> with simulated visitor data because Supabase is not configured in this environment.</span>
          <span className="bg-[#f1e05a]/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Preview</span>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>Total Sessions</p>
          <p className={`font-mono text-2xl font-bold ${DK.text} mt-1`}>{totalVisitors}</p>
        </div>
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>Active Now (5m)</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${activeSessionsCount > 0 ? "bg-[#3fb950] animate-pulse" : "bg-[#8b949e]"}`} />
            <p className={`font-mono text-2xl font-bold ${DK.text}`}>{activeSessionsCount}</p>
          </div>
        </div>
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>Avg Session Time</p>
          <p className={`font-mono text-2xl font-bold ${DK.text} mt-1`}>{formatDuration(avgDuration)}</p>
        </div>
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>Total Page Views</p>
          <p className={`font-mono text-2xl font-bold ${DK.text} mt-1`}>{totalPageViews}</p>
        </div>
      </div>

      {/* Feature Utilization Dashboard (NEW) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Visited Pages Progress Chart */}
        <div className={`rounded-lg p-4 ${DK.card} space-y-4`}>
          <div className="flex justify-between items-center border-b border-[#30363d] pb-2">
            <p className={`font-mono text-xs font-semibold ${DK.text}`}>Most Visited Pages (Feature Share)</p>
            <span className={`font-mono text-[10px] ${DK.subtle}`}>Views count</span>
          </div>
          {sortedPages.length === 0 ? (
            <p className={`font-mono text-xs ${DK.subtle} py-4 text-center`}>No page view metrics logged yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedPages.map(([page, count]) => {
                const percent = totalPageViews ? Math.round((count / totalPageViews) * 100) : 0;
                return (
                  <div key={page} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className={DK.text}>{pageLabels[page] || page}</span>
                      <span className={DK.muted}>{count} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-[#161b22] h-2 rounded-full overflow-hidden border border-[#30363d]">
                      <div 
                        className="bg-[#2f81f7] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature Interactions Grid */}
        <div className={`rounded-lg p-4 ${DK.card} space-y-4`}>
          <div className="border-b border-[#30363d] pb-2">
            <p className={`font-mono text-xs font-semibold ${DK.text}`}>Popular Feature Interactions</p>
          </div>
          <div className="grid grid-cols-2 gap-3 h-[calc(100%-2rem)]">
            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] flex flex-col justify-between">
              <span className="text-xl">🔊</span>
              <div>
                <p className={`font-mono text-[10px] ${DK.subtle} uppercase`}>Audio Recitations</p>
                <p className={`font-mono text-lg font-bold ${DK.text} mt-0.5`}>{actionCounts.play_audio || 0}</p>
              </div>
            </div>
            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] flex flex-col justify-between">
              <span className="text-xl">📖</span>
              <div>
                <p className={`font-mono text-[10px] ${DK.subtle} uppercase`}>Tafsir Opens</p>
                <p className={`font-mono text-lg font-bold ${DK.text} mt-0.5`}>{actionCounts.open_tafsir || 0}</p>
              </div>
            </div>
            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] flex flex-col justify-between">
              <span className="text-xl">🔤</span>
              <div>
                <p className={`font-mono text-[10px] ${DK.subtle} uppercase`}>W-by-W Clicks</p>
                <p className={`font-mono text-lg font-bold ${DK.text} mt-0.5`}>{actionCounts.click_wbw || 0}</p>
              </div>
            </div>
            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d] flex flex-col justify-between">
              <span className="text-xl">📿</span>
              <div>
                <p className={`font-mono text-[10px] ${DK.subtle} uppercase`}>Tasbeeh Bead Taps</p>
                <p className={`font-mono text-lg font-bold ${DK.text} mt-0.5`}>{actionCounts.tasbeeh_click || totalTasbeeh}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Companies + Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Companies */}
        <div className={`rounded-lg p-4 ${DK.card} space-y-3`}>
          <p className={`font-mono text-xs font-semibold ${DK.text}`}>Top Companies / Organizations</p>
          {topCompanies.length === 0 ? (
            <p className={`font-mono text-xs ${DK.subtle}`}>No company data available.</p>
          ) : (
            <div className="space-y-2">
              {topCompanies.map(([org, count]) => (
                <div key={org} className="flex justify-between items-center text-xs font-mono">
                  <span className={`${DK.muted} truncate max-w-[80%]`} title={org}>{org}</span>
                  <span className={`${DK.blue} font-semibold`}>{count} ({Math.round((count / totalVisitors) * 100)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Refresh Status */}
        <div className={`rounded-lg p-4 ${DK.card} flex flex-col justify-between`}>
          <div className="space-y-1">
            <p className={`font-mono text-xs font-semibold ${DK.text}`}>Dashboard Status</p>
            <p className={`font-mono text-[11px] ${DK.muted}`}>
              Auto-refreshing every 15 seconds. Telemetry logs anonymous IP organization, page navigation, and feature clicks in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => void fetchSessions(true)}
              disabled={loading}
              className={`${DK.btnBase} ${DK.btnGray} text-[11px] px-3 py-1.5`}
            >
              {loading ? "Refreshing..." : "Force Refresh"}
            </button>
            {error && <span className={`text-[10px] font-mono ${DK.red}`}>{error}</span>}
          </div>
        </div>
      </div>

      {/* Visitor Session Log Table */}
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <p className={`font-mono text-xs font-semibold ${DK.text} mb-3`}>Visitor Log ({sessions.length})</p>
        {sessions.length === 0 ? (
          <p className={`font-mono text-xs ${DK.subtle} text-center py-6`}>No visitor sessions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className={`text-start ${DK.subtle} border-b ${DK.border}`}>
                  <th className="py-2 pe-3 text-start">Start Time</th>
                  <th className="py-2 pe-3 text-start">Company / Organization</th>
                  <th className="py-2 pe-3 text-start">Location</th>
                  <th className="py-2 pe-3 text-start">Device</th>
                  <th className="py-2 pe-3 text-start">Duration</th>
                  <th className="py-2 pe-3 text-center">Bookmarks / Hifz / Tasbeeh</th>
                  <th className="py-2 text-end">Active</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const isActive = s.last_active_at >= activeThreshold;
                  return (
                    <tr key={s.id} className={`border-t ${DK.border} hover:bg-[#161b22]/40`}>
                      <td className={`py-2 pe-3 ${DK.muted}`} title={new Date(s.created_at).toLocaleString()}>
                        {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`py-2 pe-3 ${DK.text} max-w-[200px] truncate`} title={s.org}>
                        {s.org || "Unknown Organization"}
                      </td>
                      <td className={`py-2 pe-3 ${DK.muted}`}>
                        {s.city && s.country ? `${s.city}, ${s.country}` : (s.country || "Unknown")}
                      </td>
                      <td className={`py-2 pe-3 ${DK.muted} max-w-[120px] truncate`} title={s.device}>
                        {s.device || "Unknown"}
                      </td>
                      <td className={`py-2 pe-3 ${DK.text}`}>
                        {formatDuration(s.session_duration_seconds)}
                      </td>
                      <td className={`py-2 pe-3 text-center ${DK.text}`}>
                        {s.bookmarks_count || 0} / {s.hifz_count || 0} / {s.tasbeeh_count || 0}
                      </td>
                      <td className="py-2 text-end">
                        <span className={`inline-block w-2 h-2 rounded-full ${isActive ? "bg-[#3fb950]" : "bg-[#30363d]"}`} title={isActive ? "Active recently" : "Idle"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
