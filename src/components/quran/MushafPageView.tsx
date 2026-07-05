import { useState, useMemo, useEffect, useCallback } from "react";
import { Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, NotebookPen, MoreVertical } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { type Ayah } from "@/lib/quran-api";
import { cn, toArabicNumerals, stripBismillah } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWbwSurah } from "@/hooks/useWbwSurah";
import { WbwAyahText } from "@/components/quran/WbwAyahText";

interface MushafPageViewProps {
  ayahs: Ayah[];
  fontSize: number;
  lineHeight: number;
  readerToneClass: string;
  mushafFontClass?: string;
  surahNumber: number;
  highlightedAyah: number | null;
  playingAyah?: number | null;
  isBookmarked: (ayahNum: number) => boolean;
  hasNote?: (ayahNum: number) => boolean;
  toggleBookmark: (ayahNum: number) => void;
  onAyahTafsir: (ayahNum: number) => void;
  onAyahMore?: (ayahNum: number) => void;
  setAyahRef: (el: HTMLDivElement | null, num: number) => void;
  targetPage?: number | null;
  onPageChange?: (pageNum: number) => void;
  onSeekToAyah?: (ayahNum: number) => void;
  /**
   * Word-by-word mode. When true, ayah text is rendered as tappable per-word spans
   * (sourced from bundled WBW data). When false, the original Mushaf flow is used
   * verbatim — no per-word DOM nodes.
   */
  wbwEnabled?: boolean;
}

export default function MushafPageView({
  ayahs,
  fontSize,
  lineHeight,
  readerToneClass,
  mushafFontClass = "font-mushaf-uthmanic",
  surahNumber,
  highlightedAyah,
  playingAyah,
  isBookmarked,
  hasNote,
  toggleBookmark,
  onAyahTafsir,
  onAyahMore,
  setAyahRef,
  targetPage,
  onPageChange,
  onSeekToAyah,
  wbwEnabled = false
}: MushafPageViewProps) {
  const { language } = useLanguage();
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const { data: wbwData } = useWbwSurah(surahNumber, wbwEnabled);

  const pages = useMemo(() => {
    const map = new Map<number, Ayah[]>();
    for (const ayah of ayahs) {
      const page = ayah.page || 0;
      if (!map.has(page)) map.set(page, []);
      map.get(page)!.push(ayah);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [ayahs]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: "rtl",
    startIndex: 0,
    align: "center",
    containScroll: "trimSnaps",
    skipSnaps: false,
    dragFree: false
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  // Seed `currentSlide` from the initial `targetPage` / `highlightedAyah`
  // so that direct navigation to a page deep in the Mushaf doesn't
  // briefly render slide 0 before Embla scrolls into place. The window
  // is then centered on the right slide from the very first paint.
  const [currentSlide, setCurrentSlide] = useState(() => {
    if (targetPage) {
      const idx = pages.findIndex(([pageNum]) => pageNum === targetPage);
      if (idx >= 0) return idx;
    }
    if (highlightedAyah) {
      const idx = pages.findIndex(([, pageAyahs]) =>
        pageAyahs.some((a) => a.numberInSurah === highlightedAyah),
      );
      if (idx >= 0) return idx;
    }
    return 0;
  });

  /**
   * How many pages on either side of the active slide we render fully.
   * Off-window slides become lightweight placeholder divs that preserve
   * Embla's layout (same flex basis + min-height) so dragging still
   * lands on the correct snap, but they emit zero ayah DOM nodes —
   * crucial for long surahs like Al-Baqarah where rendering all ~48
   * pages up front blew through 200+ ms of main-thread work on first
   * mount.
   */
  const SLIDE_WINDOW = 1;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    const idx = emblaApi.selectedScrollSnap();
    setCurrentSlide(idx);
    if (pages[idx]) {
      onPageChange?.(pages[idx][0]);
    }
  }, [emblaApi, pages, onPageChange]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Navigate to target page when it changes
  useEffect(() => {
    if (!emblaApi || !targetPage || pages.length === 0) return;
    const idx = pages.findIndex(([pageNum]) => pageNum === targetPage);
    if (idx >= 0) {
      emblaApi.scrollTo(idx);
    }
  }, [emblaApi, targetPage, pages]);

  // Navigate to highlighted ayah's page
  useEffect(() => {
    if (!emblaApi || !highlightedAyah || pages.length === 0) return;
    const idx = pages.findIndex(([, pageAyahs]) =>
    pageAyahs.some((a) => a.numberInSurah === highlightedAyah)
    );
    if (idx >= 0) {
      emblaApi.scrollTo(idx);
    }
  }, [emblaApi, highlightedAyah, pages]);

  // Navigate to playing ayah's page
  useEffect(() => {
    if (!emblaApi || !playingAyah || pages.length === 0) return;
    const idx = pages.findIndex(([, pageAyahs]) =>
    pageAyahs.some((a) => a.numberInSurah === playingAyah)
    );
    if (idx >= 0) {
      emblaApi.scrollTo(idx);
    }
  }, [emblaApi, playingAyah, pages]);

  return (
    <div className="relative overflow-x-hidden" dir="rtl">
      {/* Page counter */}
      <div className="mb-3 text-center text-xs text-muted-foreground">
        {pages.length > 0 &&
        <span>
            {language === "ar" ? toArabicNumerals(currentSlide + 1) : currentSlide + 1} / {language === "ar" ? toArabicNumerals(pages.length) : pages.length}
          </span>
        }
      </div>

      {/* Carousel */}
      <div ref={emblaRef} className="overflow-hidden rounded-2xl touch-pan-y">
        <div className="flex">
          {pages.map(([pageNum, pageAyahs], slideIdx) => {
          const inWindow = Math.abs(slideIdx - currentSlide) <= SLIDE_WINDOW;
          if (!inWindow) {
            // Placeholder: same slot dimensions, zero ayah DOM. Embla
            // measures `basis-full` so the snap math is unchanged.
            return (
              <div
                key={pageNum}
                className="min-w-0 shrink-0 grow-0 basis-full px-0.5"
                aria-hidden
              >
                <div
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm min-h-[60vh]"
                  data-testid={`mushaf-page-${pageNum}-placeholder`}
                />
              </div>
            );
          }
          return (
          <div
            key={pageNum}
            className="min-w-0 shrink-0 grow-0 basis-full px-0.5">
            
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-h-[60vh] flex flex-col pt-[10px] pb-[10px]" data-testid={`mushaf-page-${pageNum}`}>
                {pageNum > 0 &&
              <div className="mb-4 flex items-center justify-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-bold text-primary">
                      {language === "ar" ? `صفحة ${toArabicNumerals(pageNum)}` : `Page ${pageNum}`}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
              }

                <p
                className={cn("font-arabic mushaf-no-select text-justify flex-1", mushafFontClass, readerToneClass)}
                style={{ fontSize, lineHeight }}>
                
                  {pageAyahs.map((ayah) => {
                    const wbwWords = wbwEnabled ? wbwData?.ayahs[String(ayah.numberInSurah)] : undefined;
                    return (
                <span
                  key={ayah.numberInSurah}
                  id={`ayah-${ayah.numberInSurah}`}
                  data-ayah={ayah.numberInSurah}
                  ref={(el) => setAyahRef(el as HTMLDivElement | null, ayah.numberInSurah)}
                  className={cn(
                    "transition-colors",
                    highlightedAyah === ayah.numberInSurah && "bg-primary/10 rounded-sm",
                    playingAyah === ayah.numberInSurah && "bg-primary/15 rounded-sm"
                  )}>
                  
                      {wbwWords && wbwWords.length > 0 ? (
                        <WbwAyahText ayahNumber={ayah.numberInSurah} words={wbwWords} />
                      ) : (
                        <>{stripBismillah(ayah.text, surahNumber, ayah.numberInSurah)}{" "}</>
                      )}
                      <button
                    aria-label={language === "ar" ? `الآية ${ayah.numberInSurah}` : `Ayah ${ayah.numberInSurah}`}
                    onClick={() => {
                      if (playingAyah !== null && onSeekToAyah) {
                        onSeekToAyah(ayah.numberInSurah);
                      } else {
                        setSelectedAyah(selectedAyah === ayah.numberInSurah ? null : ayah.numberInSurah);
                      }
                    }}
                    className={cn(
                      "inline-flex items-baseline transition-colors",
                      playingAyah !== null ?
                      "text-primary hover:text-primary/80 cursor-pointer" :
                      "text-primary/70 hover:text-primary"
                    )}
                    style={{ fontSize: fontSize * 0.65 }}>
                    
                        ﴿{toArabicNumerals(ayah.numberInSurah)}﴾
                      </button>{" "}
                    </span>
                    );
                  })}
                </p>

                {selectedAyah !== null &&
              pageAyahs.some((a) => a.numberInSurah === selectedAyah) &&
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg bg-muted/50 p-2">
                      <span className="text-xs text-muted-foreground">
                        {language === "ar" ? `الآية ${toArabicNumerals(selectedAyah)}` : `Ayah ${selectedAyah}`}
                      </span>
                      <button
                  aria-label={language === "ar" ? "إشارة مرجعية" : "Bookmark"}
                  onClick={() => toggleBookmark(selectedAyah)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-background">
                  
                        {isBookmarked(selectedAyah) ?
                  <BookmarkCheck className="h-4 w-4 text-accent" /> :

                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  }
                      </button>
                      <button
                  aria-label={language === "ar" ? "تفسير" : "Tafsir"}
                  onClick={() => {
                    onAyahTafsir(selectedAyah);
                    setSelectedAyah(null);
                  }}
                  className="rounded-lg p-1.5 transition-colors hover:bg-background text-muted-foreground">
                  
                        <BookOpen className="h-4 w-4" />
                      </button>
                      {onAyahMore && (
                        <button
                          aria-label={language === "ar" ? "المزيد" : "More"}
                          data-testid={`mushaf-ayah-more-${selectedAyah}`}
                          onClick={() => {
                            onAyahMore(selectedAyah);
                            setSelectedAyah(null);
                          }}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors hover:bg-background",
                            hasNote?.(selectedAyah) ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {hasNote?.(selectedAyah) ? (
                            <NotebookPen className="h-4 w-4" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
              }
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Navigation arrows for desktop */}
      {canScrollPrev &&
      <button
        aria-label={language === "ar" ? "الصفحة السابقة" : "Previous page"}
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute start-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md border border-border backdrop-blur-sm hover:bg-muted transition-colors hidden sm:flex">
        
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
      }
      {canScrollNext &&
      <button
        aria-label={language === "ar" ? "الصفحة التالية" : "Next page"}
        onClick={() => emblaApi?.scrollNext()}
        className="absolute end-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md border border-border backdrop-blur-sm hover:bg-muted transition-colors hidden sm:flex">
        
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      }
    </div>);

}