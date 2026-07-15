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
      // Supabase is not configured -> Fallback to interactive Mock Data
      setIsMock(true);
      setError(null);
      
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSessions(prev => {
        if (prev.length === 0) {
          return MOCK_SESSIONS_INITIAL;
        }
        
        // Simulate real-time session duration progress & random activity updates
        return prev.map(s => {
          const activeThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const isSessionActive = s.last_active_at >= activeThreshold;
          
          if (isSessionActive) {
            const addedSeconds = isManual ? 5 : 15;
            const rand = Math.random();
            return {
              ...s,
              session_duration_seconds: s.session_duration_seconds + addedSeconds,
              last_active_at: new Date().toISOString(),
              bookmarks_count: rand > 0.85 ? s.bookmarks_count + 1 : s.bookmarks_count,
              tasbeeh_count: rand > 0.6 ? s.tasbeeh_count + Math.floor(rand * 10) : s.tasbeeh_count,
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
          <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>Active Features Usage</p>
          <p className={`font-mono text-[10px] ${DK.muted} mt-1.5`}>
            🔖 {totalBookmarks} Bookmarks<br />
            🎯 {totalHifz} Hifz Surahs<br />
            📿 {totalTasbeeh} Tasbeehs
          </p>
        </div>
      </div>

      {/* Grid: Companies + Device Stats */}
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
              Auto-refreshing every 15 seconds. Telemetry logs anonymous IP organization and app utilization statistics in real-time.
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
                  <th className="py-2 pe-3 text-center">Stats (🔖 / 🎯 / 📿)</th>
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
