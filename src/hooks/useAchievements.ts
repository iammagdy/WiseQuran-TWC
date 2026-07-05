import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { useStreak } from "./useStreak";
import { useHifz } from "./useHifz";
import { useReadingStats } from "./useReadingStats";

export interface Achievement {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  category: "streak" | "reading" | "hifz" | "goals";
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

interface AchievementState {
  unlocked: Record<string, string>; // id -> unlocked date
  lastChecked: string;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlocked" | "unlockedAt" | "progress">[] = [
  // Streak achievements
  { id: "streak_3", title: "بداية موفقة", titleEn: "Good Start", description: "٣ أيام متواصلة من القراءة", descriptionEn: "3 consecutive reading days", icon: "🔥", category: "streak", target: 3 },
  { id: "streak_7", title: "أسبوع كامل", titleEn: "Full Week", description: "٧ أيام متواصلة من القراءة", descriptionEn: "7 consecutive reading days", icon: "🔥", category: "streak", target: 7 },
  { id: "streak_30", title: "شهر من الإلتزام", titleEn: "Month of Commitment", description: "٣٠ يوم متواصل", descriptionEn: "30 consecutive days", icon: "🏆", category: "streak", target: 30 },
  { id: "streak_100", title: "المثابر", titleEn: "The Persistent", description: "١٠٠ يوم متواصل", descriptionEn: "100 consecutive days", icon: "👑", category: "streak", target: 100 },
  { id: "streak_365", title: "سنة كاملة", titleEn: "Full Year", description: "٣٦٥ يوم متواصل", descriptionEn: "365 consecutive days", icon: "💎", category: "streak", target: 365 },

  // Reading achievements
  { id: "read_100", title: "القارئ", titleEn: "The Reader", description: "قراءة ١٠٠ آية", descriptionEn: "Read 100 verses", icon: "📖", category: "reading", target: 100 },
  { id: "read_1000", title: "الحافظ", titleEn: "The Memorizer", description: "قراءة ١٠٠٠ آية", descriptionEn: "Read 1,000 verses", icon: "📚", category: "reading", target: 1000 },
  { id: "read_5000", title: "المتقن", titleEn: "The Proficient", description: "قراءة ٥٠٠٠ آية", descriptionEn: "Read 5,000 verses", icon: "🌟", category: "reading", target: 5000 },
  { id: "read_6236", title: "ختمة القرآن", titleEn: "Quran Completion", description: "قراءة القرآن كاملاً", descriptionEn: "Read the entire Quran", icon: "🏅", category: "reading", target: 6236 },

  // Hifz achievements
  { id: "hifz_1", title: "أول سورة", titleEn: "First Surah", description: "حفظ أول سورة", descriptionEn: "Memorize the first surah", icon: "🎯", category: "hifz", target: 1 },
  { id: "hifz_10", title: "عشر سور", titleEn: "Ten Surahs", description: "حفظ ١٠ سور", descriptionEn: "Memorize 10 surahs", icon: "⭐", category: "hifz", target: 10 },
  { id: "hifz_30", title: "جزء كامل", titleEn: "Full Juz", description: "حفظ ٣٠ سورة", descriptionEn: "Memorize 30 surahs", icon: "🌙", category: "hifz", target: 30 },
  { id: "hifz_50", title: "نصف الطريق", titleEn: "Halfway There", description: "حفظ ٥٠ سورة", descriptionEn: "Memorize 50 surahs", icon: "🏆", category: "hifz", target: 50 },
  { id: "hifz_114", title: "حافظ القرآن", titleEn: "Hafidh of Quran", description: "حفظ القرآن كاملاً", descriptionEn: "Memorize all 114 surahs", icon: "👑", category: "hifz", target: 114 },

  // Goal achievements
  { id: "goal_first", title: "أول هدف", titleEn: "First Goal", description: "تحقيق الهدف اليومي لأول مرة", descriptionEn: "Complete your daily goal for the first time", icon: "🎯", category: "goals", target: 1 },
  { id: "goal_7", title: "أسبوع من النجاح", titleEn: "Week of Success", description: "تحقيق الهدف اليومي ٧ مرات", descriptionEn: "Complete your daily goal 7 times", icon: "🏅", category: "goals", target: 7 },
  { id: "goal_30", title: "شهر من الإنجاز", titleEn: "Month of Achievement", description: "تحقيق الهدف اليومي ٣٠ مرة", descriptionEn: "Complete your daily goal 30 times", icon: "🏆", category: "goals", target: 30 },
];

export function useAchievements() {
  const [state, setState] = useLocalStorage<AchievementState>("wise-achievements", {
    unlocked: {},
    lastChecked: new Date().toISOString(),
  });
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);

  const { streak } = useStreak();
  const { stats: hifzStats } = useHifz();
  const { totals } = useReadingStats();
  const totalAyahs = totals.totalAyahs;
  const memorizedCount = hifzStats.memorized;

  const getGoalCompletions = useCallback(() => {
    try {
      const data = localStorage.getItem("wise-goal-completions");
      if (data) return JSON.parse(data) as number;
    } catch (error) {
      console.error("Error reading goal completions from localStorage:", error);
    }
    return 0;
  }, []);

  const checkAndUnlock = useCallback(() => {
    const goalCompletions = getGoalCompletions();

    const newUnlocks: string[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (state.unlocked[def.id]) continue;

      let shouldUnlock = false;

      switch (def.category) {
        case "streak":
          shouldUnlock = streak >= (def.target || 0);
          break;
        case "reading":
          shouldUnlock = totalAyahs >= (def.target || 0);
          break;
        case "hifz":
          shouldUnlock = memorizedCount >= (def.target || 0);
          break;
        case "goals":
          shouldUnlock = goalCompletions >= (def.target || 0);
          break;
      }

      if (shouldUnlock) {
        newUnlocks.push(def.id);
      }
    }

    if (newUnlocks.length > 0) {
      const now = new Date().toISOString();
      setState((prev) => {
        const updatedUnlocked = { ...prev.unlocked };
        newUnlocks.forEach((id) => {
          updatedUnlocked[id] = now;
        });
        return { unlocked: updatedUnlocked, lastChecked: now };
      });

      const firstNew = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === newUnlocks[0]);
      if (firstNew) {
        setNewUnlock({ ...firstNew, unlocked: true, unlockedAt: now });
      }
    }
  }, [setState, getGoalCompletions, state.unlocked, streak, totalAyahs, memorizedCount]);

  // Re-evaluate whenever any input state changes so unlocks appear the
  // moment the underlying stat crosses a threshold. A low-frequency
  // fallback poll covers goal completions, which are still persisted
  // only in localStorage.
  useEffect(() => {
    checkAndUnlock();
    const interval = setInterval(checkAndUnlock, 30000);
    return () => clearInterval(interval);
  }, [checkAndUnlock]);

  const getAchievements = useCallback((): Achievement[] => {
    const goalCompletions = getGoalCompletions();
    const currentStreak = streak;

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      let progress = 0;
      
      switch (def.category) {
        case "streak":
          progress = currentStreak;
          break;
        case "reading":
          progress = totalAyahs;
          break;
        case "hifz":
          progress = memorizedCount;
          break;
        case "goals":
          progress = goalCompletions;
          break;
      }
      
      return {
        ...def,
        unlocked: !!state.unlocked[def.id],
        unlockedAt: state.unlocked[def.id],
        progress,
      };
    });
  }, [state.unlocked, streak, memorizedCount, totalAyahs, getGoalCompletions]);

  const dismissNewUnlock = useCallback(() => {
    setNewUnlock(null);
  }, []);

  const getUnlockedCount = useCallback(() => {
    return Object.keys(state.unlocked).length;
  }, [state.unlocked]);

  return {
    achievements: getAchievements(),
    newUnlock,
    dismissNewUnlock,
    unlockedCount: getUnlockedCount(),
    totalCount: ACHIEVEMENT_DEFINITIONS.length,
    checkAndUnlock,
  };
}
