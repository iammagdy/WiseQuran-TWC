import { useState, useMemo, useEffect, useCallback } from "react";
import { Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { type Ayah } from "@/lib/quran-api";
import { cn, toArabicNumerals, stripBismillah } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface MushafPageViewProps {
  ayahs: Ayah[];
  fontSize: number;
  surahNumber: number;
  highlightedAyah: number | null;
  playingAyah?: number | null;
  isBookmarked: (ayahNum: number) => boolean;
  toggleBookmark: (ayahNum: number) => void;
  onAyahTafsir: (ayahNum: number) => void;
  setAyahRef: (el: HTMLDivElement | null, num: number) => void;
  targetPage?: number | null;
  onPageChange?: (pageNum: number) => void;
  onSeekToAyah?: (ayahNum: number) => void;
}

export default function MushafPageView({
  ayahs,
  fontSize,
  surahNumber,
  highlightedAyah,
  playingAyah,
  isBookmarked,
  toggleBookmark,
  onAyahTafsir,
  setAyahRef,
  targetPage,
  onPageChange,
  onSeekToAyah
}: MushafPageViewProps) {
  const { language } = useLanguage();
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);

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
    startIndex: 0
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
    <div className="relative" dir="rtl">
      {/* Page counter */}
      <div className="mb-3 text-center text-xs text-muted-foreground">
        {pages.length > 0 &&
        <span>
            {language === "ar" ? toArabicNumerals(currentSlide + 1) : currentSlide + 1} / {language === "ar" ? toArabicNumerals(pages.length) : pages.length}
          </span>
        }
      </div>

      {/* Carousel */}
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {pages.map(([pageNum, pageAyahs]) =>
          <div
            key={pageNum}
            className="min-w-0 shrink-0 grow-0 basis-full">
            
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mx-1 min-h-[60vh] flex flex-col pt-[10px] pb-[10px]">
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
                className="font-arabic text-foreground text-justify flex-1"
                style={{ fontSize, lineHeight: 2.4 }}>
                
                  {pageAyahs.map((ayah) =>
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
                  
                      {stripBismillah(ayah.text, surahNumber, ayah.numberInSurah)}{" "}
                      <button
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
                )}
                </p>

                {selectedAyah !== null &&
              pageAyahs.some((a) => a.numberInSurah === selectedAyah) &&
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg bg-muted/50 p-2">
                      <span className="text-xs text-muted-foreground">
                        {language === "ar" ? `الآية ${toArabicNumerals(selectedAyah)}` : `Ayah ${selectedAyah}`}
                      </span>
                      <button
                  onClick={() => toggleBookmark(selectedAyah)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-background">
                  
                        {isBookmarked(selectedAyah) ?
                  <BookmarkCheck className="h-4 w-4 text-accent" /> :

                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  }
                      </button>
                      <button
                  onClick={() => {
                    onAyahTafsir(selectedAyah);
                    setSelectedAyah(null);
                  }}
                  className="rounded-lg p-1.5 transition-colors hover:bg-background text-muted-foreground">
                  
                        <BookOpen className="h-4 w-4" />
                      </button>
                    </div>
              }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation arrows for desktop */}
      {canScrollPrev &&
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md border border-border backdrop-blur-sm hover:bg-muted transition-colors hidden sm:flex">
        
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
      }
      {canScrollNext &&
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md border border-border backdrop-blur-sm hover:bg-muted transition-colors hidden sm:flex">
        
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      }
    </div>);

}