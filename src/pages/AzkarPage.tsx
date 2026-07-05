import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { azkarData, azkarSections, type AzkarCategory, type Dhikr } from "@/data/azkar-data";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useStreak } from "@/hooks/useStreak";
import { useAzkarCompletion } from "@/hooks/useAzkarCompletion";
import { ArrowLeft, ArrowRight, RotateCcw, Heart, CircleCheck as CheckCircle2, ChevronDown, Search, X } from "lucide-react";
import { cn, toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTION_ICONS: Record<string, string> = {
  daily: "🌙",
  prayer: "🕌",
  eating: "🍽",
  travel: "✈️",
  social: "🤝",
  hardship: "🤲",
  special: "⭐",
  quran: "📖",
  night: "🌟",
};

function BeadProgressBar({ total, remaining }: { total: number; remaining: number }) {
  const filled = total - remaining;
  const maxBeads = Math.min(total, 10);
  const filledBeads = Math.round((filled / total) * maxBeads);

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: maxBeads }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i < filledBeads ? 1 : 0.8,
            opacity: i < filledBeads ? 1 : 0.35,
          }}
          transition={{ duration: 0.2, delay: i * 0.02 }}
          className={cn(
            "rounded-full transition-colors",
            i < filledBeads
              ? "bg-primary w-3 h-3"
              : "bg-muted w-2.5 h-2.5"
          )}
        />
      ))}
    </div>
  );
}

function DhikrCounter({
  dhikr,
  fontSize,
  onComplete,
  isFavorite,
  onToggleFavorite,
}: {
  dhikr: Dhikr;
  fontSize: number;
  onComplete: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const { language, t } = useLanguage();
  const [remaining, setRemaining] = useState(dhikr.count);
  const done = remaining === 0;

  const handleTap = () => {
    if (remaining > 0) {
      if (navigator.vibrate) navigator.vibrate(10);
      const next = remaining - 1;
      setRemaining(next);
      if (next === 0) onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-5 shadow-elevated transition-all border relative overflow-hidden",
        done ? "bg-primary/8 border-primary/20" : "bg-card border-border/40"
      )}
    >
      {done && (
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      )}

      <div className="flex items-center justify-between mb-3">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onToggleFavorite}
          className="rounded-xl p-2 transition-colors hover:bg-muted"
        >
          <Heart className={cn("h-4.5 w-4.5 transition-all", isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} style={{ width: '18px', height: '18px' }} />
        </motion.button>

        <div className="flex-1 mx-3">
          <BeadProgressBar total={dhikr.count} remaining={remaining} />
        </div>

        {done && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </motion.div>
        )}
      </div>

      <p
        className="font-arabic leading-loose text-right text-foreground mb-3"
        style={{ fontSize: fontSize * 0.85 }}
        dir="rtl"
      >
        {dhikr.text}
      </p>

      {language === "en" && (
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{dhikr.translation}</p>
      )}
      {dhikr.source && (
        <p className="text-[11px] text-muted-foreground/50 mb-3 text-right" dir="rtl">{dhikr.source}</p>
      )}

      <div className="flex items-center gap-2 mt-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setRemaining(dhikr.count)}
          className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted transition-colors flex-shrink-0"
        >
          <RotateCcw className="h-4 w-4" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleTap}
          className={cn(
            "flex flex-1 items-center justify-center rounded-xl text-base font-bold transition-all shadow-soft min-h-[48px] gap-2",
            done
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground"
          )}
          style={{
            boxShadow: done
              ? "0 4px 14px -2px hsl(var(--primary) / 0.35)"
              : "0 4px 14px -2px hsl(var(--accent) / 0.35)"
          }}
        >
          {done
            ? "✓"
            : <>
                <span className="text-lg font-bold tabular-nums">
                  {language === "ar" ? toArabicNumerals(remaining) : remaining}
                </span>
                <span className="text-sm opacity-80">{t("times")}</span>
              </>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}

function CategoryCard({
  cat,
  isCategoryDone,
  isRTL,
  language,
  onClick,
}: {
  cat: AzkarCategory;
  isCategoryDone: (id: string) => boolean;
  isRTL: boolean;
  language: string;
  onClick: () => void;
}) {
  const done = isCategoryDone(cat.id);
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col rounded-2xl p-3.5 shadow-soft border transition-all group w-full text-start",
        done
          ? "bg-primary/8 border-primary/20"
          : "bg-card border-border/40 hover:border-primary/20 hover:shadow-elevated"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {done && (
        <div className={cn(
          "absolute top-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center",
          isRTL ? "left-2" : "right-2"
        )}>
          <span className="text-primary-foreground text-[8px] font-bold">✓</span>
        </div>
      )}

      <p className="font-bold text-xs leading-snug text-foreground mb-1.5 pr-5">
        {language === "ar" ? cat.nameAr : cat.name}
      </p>
      <span className={cn(
        "text-[10px] rounded-full px-1.5 py-0.5 font-medium w-fit",
        done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {language === "en"
          ? `${cat.items.length}`
          : toArabicNumerals(cat.items.length)}
      </span>
    </motion.button>
  );
}

export default function AzkarPage() {
  const { t, language, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<AzkarCategory | null>(null);
  const [fontSize] = useLocalStorage<number>("wise-font-size", 24);
  const [favoriteAzkar, setFavoriteAzkar] = useLocalStorage<string[]>("wise-favorite-azkar", []);
  const [showFavorites, setShowFavorites] = useState(false);
  const [expandedSections, setExpandedSections] = useLocalStorage<string[]>("wise-azkar-expanded-sections", ["daily"]);
  const [searchQuery, setSearchQuery] = useState("");
  const { markActive } = useStreak();
  const { isCategoryDone } = useAzkarCompletion();

  const expandedSet = useMemo(() => new Set(expandedSections), [expandedSections]);

  const toggleFavorite = (id: string) => {
    setFavoriteAzkar(
      favoriteAzkar.includes(id)
        ? favoriteAzkar.filter((f) => f !== id)
        : [...favoriteAzkar, id]
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(
      expandedSet.has(sectionId)
        ? expandedSections.filter((s) => s !== sectionId)
        : [...expandedSections, sectionId]
    );
  };

  const favoriteDhikrItems = azkarData
    .flatMap((cat) => cat.items)
    .filter((d) => favoriteAzkar.includes(d.id));

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return azkarSections
      .map((section) => {
        const matchingCats = azkarData.filter(
          (cat) =>
            cat.sectionId === section.id &&
            (cat.nameAr.includes(searchQuery) ||
              cat.name.toLowerCase().includes(q))
        );
        return { section, matchingCats };
      })
      .filter((s) => s.matchingCats.length > 0);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="px-4 pb-5 pt-5" dir={isRTL ? "rtl" : "ltr"}>
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="mb-0.5 text-2xl font-bold heading-decorated">{t("azkar_title")}</h1>
                <p className="text-xs text-muted-foreground">{t("azkar_subtitle")}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowFavorites(!showFavorites); setSearchQuery(""); }}
                className={cn(
                  "rounded-xl p-2.5 transition-all shadow-soft border",
                  showFavorites
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    : "bg-card text-muted-foreground hover:bg-muted border-border/40"
                )}
              >
                <Heart className={cn("h-5 w-5", showFavorites && "fill-rose-500")} />
              </motion.button>
            </div>

            {!showFavorites && (
              <div className="relative mb-4">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none", isRTL ? "right-3" : "left-3")} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("azkar_search")}
                  className={cn(
                    "w-full h-10 rounded-xl bg-card border border-border/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-soft",
                    isRTL ? "pr-9 pl-9 text-right" : "pl-9 pr-9"
                  )}
                  dir={isRTL ? "rtl" : "ltr"}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors", isRTL ? "left-3" : "right-3")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {showFavorites ? (
              <div>
                <h2 className="mb-4 text-base font-bold flex items-center gap-2">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  {t("favorites")}
                </h2>
                {favoriteDhikrItems.length === 0 ? (
                  <div className="rounded-2xl bg-muted/30 border border-border/30 p-10 text-center">
                    <Heart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("no_favorites_azkar")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {favoriteDhikrItems.map((dhikr) => (
                      <DhikrCounter
                        key={dhikr.id}
                        dhikr={dhikr}
                        fontSize={fontSize}
                        onComplete={() => markActive()}
                        isFavorite={true}
                        onToggleFavorite={() => toggleFavorite(dhikr.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : isSearching ? (
              <div className="space-y-4">
                {filteredSections && filteredSections.length > 0 ? (
                  filteredSections.map(({ section, matchingCats }) => (
                    <div key={section.id}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1 flex items-center gap-2">
                        <span>{SECTION_ICONS[section.id] || "📌"}</span>
                        {language === "ar" ? section.nameAr : section.name}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {matchingCats.map((cat) => (
                          <CategoryCard
                            key={cat.id}
                            cat={cat}
                            isCategoryDone={isCategoryDone}
                            isRTL={isRTL}
                            language={language}
                            onClick={() => setSelectedCategory(cat)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-muted/30 border border-border/30 p-10 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("azkar_no_results")}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {azkarSections.map((section) => {
                  const isExpanded = expandedSet.has(section.id);
                  const cats = azkarData.filter((c) => c.sectionId === section.id);
                  const doneCount = cats.filter((c) => isCategoryDone(c.id)).length;
                  const allSectionDone = doneCount === cats.length && cats.length > 0;

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-2xl border shadow-soft overflow-hidden transition-all",
                        allSectionDone ? "bg-primary/5 border-primary/15" :
                        isExpanded ? "bg-card border-primary/20" : "bg-card border-border/40"
                      )}
                    >
                      <motion.button
                        onClick={() => toggleSection(section.id)}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors"
                        dir={isRTL ? "rtl" : "ltr"}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{SECTION_ICONS[section.id] || "📌"}</span>
                          <p className="font-bold text-sm text-foreground">
                            {language === "ar" ? section.nameAr : section.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {doneCount > 0 && (
                            <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                              {language === "en"
                                ? `${doneCount}/${cats.length}`
                                : `${toArabicNumerals(doneCount)}/${toArabicNumerals(cats.length)}`}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                            {language === "en" ? cats.length : toArabicNumerals(cats.length)}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </motion.button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-2">
                              {cats.map((cat) => (
                                <CategoryCard
                                  key={cat.id}
                                  cat={cat}
                                  isCategoryDone={isCategoryDone}
                                  isRTL={isRTL}
                                  language={language}
                                  onClick={() => setSelectedCategory(cat)}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          >
            <div className="mb-5 flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedCategory(null)}
                className="rounded-xl p-2.5 hover:bg-muted transition-colors flex-shrink-0 bg-card border border-border/40 shadow-soft"
              >
                <BackIcon className="h-5 w-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold">
                  {language === "ar" ? selectedCategory.nameAr : selectedCategory.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === "en"
                    ? `${selectedCategory.items.length} adhkar`
                    : `${toArabicNumerals(selectedCategory.items.length)} أذكار`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedCategory.items.map((dhikr, i) => (
                <motion.div
                  key={dhikr.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <DhikrCounter
                    dhikr={dhikr}
                    fontSize={fontSize}
                    onComplete={() => markActive()}
                    isFavorite={favoriteAzkar.includes(dhikr.id)}
                    onToggleFavorite={() => toggleFavorite(dhikr.id)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
