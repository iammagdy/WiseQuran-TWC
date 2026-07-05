import { useEffect, useState } from "react";
import { BookOpen, Loader2, WifiOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchTafsir, type TafsirAyah } from "@/lib/tafsir-api";
import { isOfflineTafsirEdition } from "@/lib/offline-tafsir";
import { TAFSIR_EDITIONS } from "@/data/tafsir-editions";
import { useLanguage } from "@/contexts/LanguageContext";
import { toArabicNumerals } from "@/lib/utils";

interface TafsirSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surahNumber: number;
  surahName: string;
  ayahNumber: number | null;
  ayahText?: string;
  editionId: string;
}

export default function TafsirSheet({
  open,
  onOpenChange,
  surahNumber,
  surahName,
  ayahNumber,
  ayahText,
  editionId,
}: TafsirSheetProps) {
  const { t, language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ayahs, setAyahs] = useState<TafsirAyah[]>([]);
  const [loadedFor, setLoadedFor] = useState<{ surah: number; edition: string } | null>(null);

  const isOffline = isOfflineTafsirEdition(editionId);
  const edition = TAFSIR_EDITIONS.find((e) => e.id === editionId);
  const editionName = language === "en" ? edition?.nameEn ?? editionId : edition?.name ?? editionId;

  useEffect(() => {
    if (!open || ayahNumber === null) return;
    if (loadedFor && loadedFor.surah === surahNumber && loadedFor.edition === editionId) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    fetchTafsir(surahNumber, editionId)
      .then((data) => {
        if (cancelled) return;
        setAyahs(data);
        setLoadedFor({ surah: surahNumber, edition: editionId });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t("error_loading"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, surahNumber, editionId, ayahNumber, loadedFor, t]);

  const tafsirText = ayahNumber !== null
    ? ayahs.find((a) => a.numberInSurah === ayahNumber)?.text
    : undefined;

  const displayedAyahNumber = ayahNumber !== null
    ? (language === "ar" ? toArabicNumerals(ayahNumber) : String(ayahNumber))
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-testid="tafsir-sheet"
        dir={isRTL ? "rtl" : "ltr"}
        className="max-h-[85vh] rounded-t-3xl p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 text-start">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-arabic text-base truncate">
                  {t("tafsir_tab")} · {surahName} · {t("ayah")} {displayedAyahNumber}
                </SheetTitle>
                <p className="text-[0.6875rem] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="font-arabic truncate">{editionName}</span>
                  {isOffline && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[0.625rem] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0"
                      title={language === "ar" ? "متوفر دون اتصال" : "Available offline"}
                    >
                      <WifiOff className="h-2.5 w-2.5" />
                      {language === "ar" ? "دون اتصال" : "Offline"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-4 pb-10">
            {ayahText && (
              <div className="rounded-2xl bg-muted/40 p-4 border border-border/40">
                <p
                  className="font-arabic text-foreground leading-[2] text-end"
                  style={{ fontSize: 22 }}
                  dir="rtl"
                >
                  {ayahText}
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-xl bg-destructive/10 p-4 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : tafsirText ? (
              <div className="rounded-2xl bg-card p-4 border border-border shadow-sm">
                <p
                  className="font-arabic text-foreground/90 leading-[2.2] text-end"
                  style={{ fontSize: 18 }}
                  dir="rtl"
                >
                  {tafsirText}
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t("no_tafsir")}
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
