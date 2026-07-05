import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Lock, CircleCheck as CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAchievements, type Achievement } from "@/hooks/useAchievements";
import { Progress } from "@/components/ui/progress";
import { cn, toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  trigger?: React.ReactNode;
}

export function AchievementsSheet({ trigger }: Props) {
  const { achievements, unlockedCount, totalCount } = useAchievements();
  const { t, language, isRTL } = useLanguage();

  const categories = [
    { id: "streak", name: t("achievement_streak"), icon: "🔥" },
    { id: "reading", name: t("achievement_reading"), icon: "📖" },
    { id: "hifz", name: t("achievement_hifz"), icon: "🎯" },
    { id: "goals", name: t("achievement_goals"), icon: "🏆" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 shadow-soft border border-border/50 transition-all hover:shadow-elevated">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">
              {language === "ar" ? toArabicNumerals(unlockedCount) : unlockedCount}/{language === "ar" ? toArabicNumerals(totalCount) : totalCount}
            </span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 [&>button:last-child]:hidden">
        <SheetHeader className="px-6 pb-4 border-b border-border">
          <SheetTitle className="text-center font-bold text-lg">{t("achievements")}</SheetTitle>
        </SheetHeader>

        {/* Progress summary */}
        <div className="px-6 py-4">
          <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-primary/10 p-4 border border-gold/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{t("overall_progress")}</span>
              <span className="text-sm font-bold text-gold">
                {language === "ar" ? toArabicNumerals(unlockedCount) : unlockedCount} / {language === "ar" ? toArabicNumerals(totalCount) : totalCount}
              </span>
            </div>
            <Progress value={(unlockedCount / totalCount) * 100} className="h-2" />
          </div>
        </div>

        {/* Categories */}
        <div className="overflow-y-auto max-h-[calc(85vh-200px)] px-6 pb-8" dir={isRTL ? "rtl" : "ltr"}>
          {categories.map((category) => {
            const categoryAchievements = achievements.filter((a) => a.category === category.id);
            const unlockedInCategory = categoryAchievements.filter((a) => a.unlocked).length;

            return (
              <div key={category.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{category.icon}</span>
                  <h3 className="font-bold text-foreground">{category.name}</h3>
                  <span className="text-xs text-muted-foreground mr-auto">
                    {language === "ar" ? toArabicNumerals(unlockedInCategory) : unlockedInCategory}/{language === "ar" ? toArabicNumerals(categoryAchievements.length) : categoryAchievements.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {categoryAchievements.map((achievement) => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { language } = useLanguage();
  const progressPercent = achievement.target
    ? Math.min((achievement.progress || 0) / achievement.target * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl p-4 border transition-all",
        achievement.unlocked
          ? "bg-primary/5 border-primary/20 shadow-soft"
          : "bg-muted/30 border-border/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-2xl",
            achievement.unlocked
              ? "bg-gradient-to-br from-gold/20 to-primary/20"
              : "bg-muted/50 grayscale opacity-50"
          )}
        >
          {achievement.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-bold text-sm",
              achievement.unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {language === "en" && achievement.titleEn ? achievement.titleEn : achievement.title}
            </h4>
            {achievement.unlocked ? (
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === "en" && achievement.descriptionEn ? achievement.descriptionEn : achievement.description}
          </p>

          {!achievement.unlocked && achievement.target && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground mb-1">
                <span>{language === "ar" ? toArabicNumerals(achievement.progress || 0) : achievement.progress || 0}</span>
                <span>{language === "ar" ? toArabicNumerals(achievement.target) : achievement.target}</span>
              </div>
              <Progress value={progressPercent} className="h-1" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// New unlock notification overlay
export function AchievementUnlockNotification() {
  const { newUnlock, dismissNewUnlock } = useAchievements();
  const { t, language } = useLanguage();

  return (
    <AnimatePresence>
      {newUnlock && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={dismissNewUnlock}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative w-72 rounded-3xl bg-card p-8 shadow-elevated text-center border border-gold/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti effect */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: "50%",
                    y: "50%",
                  }}
                  animate={{
                    opacity: 0,
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                  }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1"][i % 4],
                  }}
                />
              ))}
            </div>

            <button
              onClick={dismissNewUnlock}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="text-6xl mb-4"
            >
              {newUnlock.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs text-gold font-semibold mb-1">{t("new_achievement")}</p>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === "en" && newUnlock.titleEn ? newUnlock.titleEn : newUnlock.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "en" && newUnlock.descriptionEn ? newUnlock.descriptionEn : newUnlock.description}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
