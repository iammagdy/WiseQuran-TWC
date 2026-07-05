import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { HighlightText } from "@/components/HighlightText";
import { stripBismillah } from "@/lib/utils";
import type { Ayah } from "@/lib/quran-api";
import type { TafsirAyah } from "@/lib/tafsir-api";

const HISTORY_KEY = "wise-surah-search-history";
const MAX_HISTORY = 8;

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}

function addToHistory(term: string) {
  const history = getHistory().filter((h) => h !== term);
  history.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

interface Match {
  ayah: Ayah;
  translation?: TafsirAyah;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  ayahs: Ayah[];
  surahNumber: number;
  translationAyahs?: TafsirAyah[];
  language: string;
  onScrollToAyah: (numberInSurah: number) => void;
}

export function SearchModal({ open, onClose, ayahs, surahNumber, translationAyahs = [], language, onScrollToAyah }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [history, setHistory] = useState<string[]>(getHistory);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches: Match[] = query.trim().length < 1
    ? []
    : ayahs.filter((ayah) => {
        const text = stripBismillah(ayah.text, surahNumber, ayah.numberInSurah);
        if (text.includes(query)) return true;
        const trans = translationAyahs.find((t) => t.numberInSurah === ayah.numberInSurah);
        return trans?.text?.toLowerCase().includes(query.toLowerCase()) ?? false;
      }).map((ayah) => ({
        ayah,
        translation: translationAyahs.find((t) => t.numberInSurah === ayah.numberInSurah),
      }));

  useEffect(() => {
    if (open) {
      setQuery("");
      setMatchIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setMatchIndex(0);
  }, [query]);

  // Derive the selected ayah number explicitly so the scroll effect
  // re-fires whenever the *target ayah* changes — including the
  // diagnostic edge case where the user replaces the query, the new
  // result count happens to equal the old one, and matchIndex stays
  // at 0 (so the previous `[matchIndex, matches.length]` deps would
  // never re-trigger and the reader would stay parked on the previous
  // surah's first match). `onScrollToAyah` comes from a useCallback
  // in SurahReaderPage so adding it as a dep is identity-stable and
  // doesn't loop the effect.
  const selectedAyahNumber =
    matches.length > 0 ? matches[matchIndex]?.ayah.numberInSurah ?? null : null;

  useEffect(() => {
    if (selectedAyahNumber != null) {
      onScrollToAyah(selectedAyahNumber);
    }
  }, [selectedAyahNumber, onScrollToAyah]);

  const handleSearch = useCallback((term: string) => {
    if (term.trim()) {
      addToHistory(term.trim());
      setHistory(getHistory());
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch(query);
    if (e.key === "Escape") onClose();
  };

  const goToNext = () => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
  };

  const goToPrev = () => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-background border-b border-border/60 shadow-xl"
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === "ar" ? "ابحث في آيات السورة..." : "Search ayahs in this surah..."}
                className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground"
                dir={language === "ar" ? "rtl" : "ltr"}
              />
              {query && (
                <button onClick={() => setQuery("")} className="p-1 rounded-full hover:bg-muted transition-colors" aria-label={language === "ar" ? "مسح البحث" : "Clear search"}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-xs font-medium">
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            {/* Results count + navigation */}
            {query.trim() && (
              <div className="flex items-center justify-between px-4 pb-3 border-t border-border/40 pt-2">
                <span className="text-xs text-muted-foreground">
                  {matches.length === 0
                    ? (language === "ar" ? "لا نتائج" : "No results")
                    : language === "ar"
                      ? `${matchIndex + 1} من ${matches.length} نتيجة`
                      : `${matchIndex + 1} of ${matches.length} result${matches.length !== 1 ? "s" : ""}`}
                </span>
                {matches.length > 1 && (
                  <div className="flex gap-1">
                    <button
                      onClick={goToPrev}
                      className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      aria-label={language === "ar" ? "النتيجة السابقة" : "Previous result"}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      aria-label={language === "ar" ? "النتيجة التالية" : "Next result"}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Results list or history */}
          <div className="flex-1 overflow-y-auto bg-background">
            {!query.trim() && history.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {language === "ar" ? "البحث الأخير" : "Recent Searches"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {history.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 rounded-full bg-muted text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                      dir="rtl"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.trim() && matches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">{language === "ar" ? "لا توجد نتائج" : "No results found"}</p>
                <p className="text-xs mt-1 opacity-60">
                  {language === "ar" ? "جرّب كلمة مختلفة" : "Try a different keyword"}
                </p>
              </div>
            )}

            {matches.map((match, idx) => {
              const isActive = idx === matchIndex;
              const text = stripBismillah(match.ayah.text, surahNumber, match.ayah.numberInSurah);
              return (
                <button
                  key={match.ayah.numberInSurah}
                  onClick={() => {
                    setMatchIndex(idx);
                    onScrollToAyah(match.ayah.numberInSurah);
                    handleSearch(query);
                    onClose();
                  }}
                  className={`w-full text-start px-4 py-4 border-b border-border/30 transition-colors ${
                    isActive ? "bg-primary/6" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {match.ayah.numberInSurah}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-arabic text-base leading-loose text-end" dir="rtl">
                        <HighlightText text={text} highlight={query} />
                      </p>
                      {match.translation && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed" dir="ltr">
                          <HighlightText text={match.translation.text} highlight={query} />
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
