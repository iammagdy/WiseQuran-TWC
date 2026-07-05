import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";
import { SURAH_META } from "@/data/surah-meta";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn, toArabicNumerals } from "@/lib/utils";

interface Props {
  surahNumber: number;
  ayahFrom: number;
  ayahTo: number;
  onSurahChange: (n: number) => void;
  onRangeChange: (from: number, to: number) => void;
}

export default function SurahRangeSelector({ surahNumber, ayahFrom, ayahTo, onSurahChange, onRangeChange }: Props) {
  const { t, language, isRTL } = useLanguage();
  const [surahOpen, setSurahOpen] = useState(false);
  const [search, setSearch] = useState("");

  const meta = SURAH_META.find((s) => s.number === surahNumber)!;
  const totalAyahs = meta.numberOfAyahs;

  const filtered = SURAH_META.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      String(s.number).includes(q)
    );
  });

  useEffect(() => {
    onRangeChange(1, Math.min(10, totalAyahs));
  }, [surahNumber]);

  const handleFrom = (val: number) => {
    const clamped = Math.max(1, Math.min(val, ayahTo));
    onRangeChange(clamped, ayahTo);
  };

  const handleTo = (val: number) => {
    const clamped = Math.max(ayahFrom, Math.min(val, totalAyahs));
    onRangeChange(ayahFrom, clamped);
  };

  return (
    <div className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Surah Picker */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground mb-2 block">{t("select_surah")}</label>
        <button
          onClick={() => setSurahOpen((p) => !p)}
          className="w-full flex items-center justify-between rounded-2xl bg-card border border-border/50 px-4 py-3.5 shadow-soft hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {language === "ar" ? toArabicNumerals(surahNumber) : surahNumber}
            </span>
            <div className="text-start">
              <p className="font-arabic font-bold text-base leading-tight">{meta.name}</p>
              <p className="text-xs text-muted-foreground">{meta.englishName}</p>
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", surahOpen && "rotate-180")} />
        </button>

        {surahOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-2xl bg-card border border-border/50 shadow-elevated overflow-hidden"
          >
            <div className="p-2 border-b border-border/50">
              <input
                type="text"
                placeholder={language === "ar" ? "بحث..." : "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl bg-muted/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.number}
                  onClick={() => {
                    onSurahChange(s.number);
                    setSurahOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-start",
                    s.number === surahNumber && "bg-primary/5 text-primary"
                  )}
                >
                  <span className="w-6 text-xs font-mono text-muted-foreground">
                    {language === "ar" ? toArabicNumerals(s.number) : s.number}
                  </span>
                  <span className="font-arabic font-semibold text-sm">{s.name}</span>
                  <span className="text-xs text-muted-foreground ms-auto">{language === "ar" ? toArabicNumerals(s.numberOfAyahs) : s.numberOfAyahs} {t("ayah")}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Verse Range */}
      <div>
        <label className="text-sm font-semibold text-muted-foreground mb-2 block">{t("select_range")}</label>
        <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">{t("verse_from")}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFrom(ayahFrom - 1)}
                  disabled={ayahFrom <= 1}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-muted/70 transition-colors"
                >−</button>
                <span className="flex-1 text-center font-bold text-lg tabular-nums">
                  {language === "ar" ? toArabicNumerals(ayahFrom) : ayahFrom}
                </span>
                <button
                  onClick={() => handleFrom(ayahFrom + 1)}
                  disabled={ayahFrom >= ayahTo}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-muted/70 transition-colors"
                >+</button>
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">{t("verse_to")}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTo(ayahTo - 1)}
                  disabled={ayahTo <= ayahFrom}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-muted/70 transition-colors"
                >−</button>
                <span className="flex-1 text-center font-bold text-lg tabular-nums">
                  {language === "ar" ? toArabicNumerals(ayahTo) : ayahTo}
                </span>
                <button
                  onClick={() => handleTo(ayahTo + 1)}
                  disabled={ayahTo >= totalAyahs}
                  className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-muted/70 transition-colors"
                >+</button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              {language === "ar"
                ? `${toArabicNumerals(ayahTo - ayahFrom + 1)} ${t("ayahs")}`
                : `${ayahTo - ayahFrom + 1} ${t("verses")}`}
            </span>
            <span className="ms-auto opacity-60">{meta.englishName} · {meta.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
