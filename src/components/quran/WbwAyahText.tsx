import { useState, useId } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { toArabicNumerals } from "@/lib/utils";
import type { WbwWord } from "@/lib/wbw";

interface WbwAyahTextProps {
  ayahNumber: number;
  words: WbwWord[];
  /** Inline element class (e.g. font-arabic + tone color); the parent owns fontSize/lineHeight. */
  className?: string;
}

/**
 * Renders an ayah as per-word tappable Arabic spans.
 * Each word opens a small popover with English meaning, root, and position.
 *
 * IMPORTANT: This component is only mounted when WBW mode is on, so casual
 * readers never pay the per-word DOM cost.
 */
export function WbwAyahText({ ayahNumber, words, className }: WbwAyahTextProps) {
  const { language } = useLanguage();
  const [openPos, setOpenPos] = useState<number | null>(null);
  const idBase = useId();

  return (
    <>
      {words.map((w) => (
        <span key={`${idBase}-${w.p}`} className="whitespace-nowrap">
          <Popover
            open={openPos === w.p}
            onOpenChange={(o) => setOpenPos(o ? w.p : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={
                  language === "ar"
                    ? `كلمة ${toArabicNumerals(w.p)} من الآية ${toArabicNumerals(ayahNumber)}`
                    : `Word ${w.p} of ayah ${ayahNumber}`
                }
                data-testid={`wbw-word-${ayahNumber}-${w.p}`}
                className={
                  (className ? className + " " : "") +
                  "inline align-baseline cursor-pointer rounded px-0.5 hover:bg-primary/10 active:bg-primary/15 transition-colors"
                }
                style={{ font: "inherit", color: "inherit", lineHeight: "inherit" }}
              >
                {w.a}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-64 p-3"
              dir={language === "ar" ? "rtl" : "ltr"}
            >
              <div className="space-y-2">
                <p className="font-arabic text-2xl text-foreground text-center" lang="ar" dir="rtl">
                  {w.a}
                </p>
                {w.tr && (
                  <p className="text-xs italic text-muted-foreground text-center" dir="ltr">
                    {w.tr}
                  </p>
                )}
                <div className="border-t border-border pt-2 space-y-1.5 text-sm">
                  <div>
                    <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                      {language === "ar" ? "المعنى" : "Meaning"}
                    </p>
                    <p className="text-foreground" dir="ltr">{w.t || "—"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                        {language === "ar" ? "الجذر" : "Root"}
                      </p>
                      <p className="font-arabic text-base text-primary" lang="ar" dir="rtl">
                        {w.root || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                        {language === "ar" ? "الموضع" : "Position"}
                      </p>
                      <p className="text-foreground tabular-nums" dir="ltr">
                        {w.p} / {words.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {" "}
        </span>
      ))}
    </>
  );
}
