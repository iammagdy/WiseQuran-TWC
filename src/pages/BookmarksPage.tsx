import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, NotebookPen, Trash2, Search, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn, toArabicNumerals } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BookmarksPage() {
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { bookmarks, loaded, remove } = useBookmarks();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter((b) => {
      return (
        b.surahName.toLowerCase().includes(q) ||
        b.ayahText.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q) ||
        String(b.surah).includes(q) ||
        String(b.ayah).includes(q)
      );
    });
  }, [bookmarks, query]);

  const ArrowBack = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen px-4 pt-4 pb-surah-reader" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          data-testid="bookmarks-back-button"
          className="rounded-xl p-2.5 hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t("back")}
        >
          <ArrowBack className="h-5 w-5" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate" data-testid="bookmarks-title">
            {language === "ar" ? "إشاراتي المرجعية" : "My Bookmarks"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {language === "ar"
              ? `${toArabicNumerals(bookmarks.length)} ${bookmarks.length === 1 ? "آية" : "آيات"}`
              : `${bookmarks.length} ${bookmarks.length === 1 ? "ayah" : "ayat"}`}
          </p>
        </div>
      </div>

      {/* Search */}
      {bookmarks.length > 0 && (
        <div className="relative mb-4">
          <Search
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
            style={isRTL ? { right: "0.75rem" } : { left: "0.75rem" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={language === "ar" ? "ابحث في الإشارات..." : "Search bookmarks..."}
            dir={isRTL ? "rtl" : "ltr"}
            data-testid="bookmarks-search-input"
            className="w-full rounded-xl bg-card border border-border/50 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 shadow-soft"
            style={isRTL ? { paddingRight: "2.5rem", paddingLeft: query ? "2.5rem" : "1rem" } : { paddingLeft: "2.5rem", paddingRight: query ? "2.5rem" : "1rem" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              style={isRTL ? { left: "0.75rem" } : { right: "0.75rem" }}
              aria-label={t("close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center px-4">
          <div className="rounded-full bg-primary/10 p-5 mb-4">
            <Bookmark className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">{t("no_bookmarks")}</h2>
          <p className="text-xs text-muted-foreground max-w-xs">
            {language === "ar"
              ? "افتح أي سورة وأضف إشارة مرجعية لآية لتظهر هنا."
              : "Open any surah and bookmark an ayah to see it here."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {language === "ar" ? `لا توجد نتائج لـ "${query}"` : `No results for "${query}"`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft"
              data-testid={`bookmark-card-${b.surah}-${b.ayah}`}
            >
              <button
                type="button"
                onClick={() => navigate(`/surah/${b.surah}?ayah=${b.ayah}`)}
                className={cn("block w-full", isRTL ? "text-end" : "text-start")}
                data-testid={`bookmark-open-${b.surah}-${b.ayah}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookmarkCheck className="h-4 w-4 shrink-0 text-amber-500" />
                    <p className="font-arabic text-sm font-bold text-foreground truncate">
                      {b.surahName || `${t("surah")} ${b.surah}`}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {language === "ar"
                        ? `الآية ${toArabicNumerals(b.ayah)}`
                        : `${t("ayah")} ${b.ayah}`}
                    </span>
                  </div>
                </div>

                {b.ayahText && (
                  <p
                    className="font-arabic line-clamp-3 text-base leading-[2] text-foreground/90"
                    dir="rtl"
                    style={{ textAlign: "right" }}
                  >
                    {b.ayahText}
                  </p>
                )}

                {b.note && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="line-clamp-3 flex-1 text-xs text-foreground/90">{b.note}</p>
                  </div>
                )}
              </button>

              <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {new Date(b.updatedAt).toLocaleDateString(language === "ar" ? "ar-EG" : undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-destructive/80 hover:bg-destructive/10"
                      data-testid={`bookmark-remove-${b.surah}-${b.ayah}`}
                    >
                      <Trash2 className="h-3 w-3" />
                      {language === "ar" ? "إزالة" : "Remove"}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {language === "ar" ? "إزالة الإشارة المرجعية" : "Remove bookmark"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {language === "ar"
                          ? "سيتم حذف الإشارة المرجعية وأي ملاحظة مرتبطة بها."
                          : "This will delete the bookmark and any attached note."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogAction
                        onClick={() => void remove(b.surah, b.ayah)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {language === "ar" ? "إزالة" : "Remove"}
                      </AlertDialogAction>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
