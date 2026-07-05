import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, NotebookPen, Share2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { toArabicNumerals } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AyahActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surah: number;
  ayah: number;
  ayahText: string;
  surahName: string;
  isBookmarked: boolean;
  note: string;
  onToggleBookmark: () => void | Promise<void>;
  onSaveNote: (note: string) => void | Promise<void>;
  onDeleteNote: () => void | Promise<void>;
}

export default function AyahActionsSheet({
  open,
  onOpenChange,
  surah,
  ayah,
  ayahText,
  surahName,
  isBookmarked,
  note,
  onToggleBookmark,
  onSaveNote,
  onDeleteNote,
}: AyahActionsSheetProps) {
  const { t, language, isRTL } = useLanguage();
  const [editingNote, setEditingNote] = useState(false);
  const [draft, setDraft] = useState(note);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(note);
      setEditingNote(false);
    }
  }, [open, note]);

  useEffect(() => {
    if (editingNote && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editingNote]);

  const handleShare = async () => {
    const body = `${ayahText}\n\n— ${surahName} ${language === "ar" ? toArabicNumerals(ayah) : ayah}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text: body });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(body);
        toast({ title: t("copied") });
      }
    } catch {
      // user cancelled share or clipboard blocked
    }
    onOpenChange(false);
  };

  const handleSaveNote = async () => {
    await onSaveNote(draft.trim());
    setEditingNote(false);
    if (draft.trim()) {
      toast({ title: t("note_saved") });
    }
  };

  const handleDeleteNote = async () => {
    await onDeleteNote();
    setDraft("");
    setEditingNote(false);
  };

  const ayahLabel = language === "ar"
    ? `${surahName} · الآية ${toArabicNumerals(ayah)}`
    : `${surahName} · ${t("ayah")} ${ayah}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl"
        dir={isRTL ? "rtl" : "ltr"}
        data-testid="ayah-actions-sheet"
      >
        <SheetHeader>
          <SheetTitle className="text-start">{ayahLabel}</SheetTitle>
        </SheetHeader>

        {/* Ayah preview */}
        {ayahText && (
          <p
            className="mt-3 max-h-32 overflow-y-auto rounded-xl bg-muted/40 p-3 text-start font-arabic text-base leading-[2] text-foreground/90"
            dir="rtl"
          >
            {ayahText}
          </p>
        )}

        {/* Action rows */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => void onToggleBookmark()}
            data-testid="ayah-actions-bookmark"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-start transition-colors hover:bg-muted/60",
            )}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-5 w-5 shrink-0 text-amber-500" />
            ) : (
              <Bookmark className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm font-medium">
              {isBookmarked
                ? language === "ar" ? "إزالة الإشارة المرجعية" : "Remove bookmark"
                : language === "ar" ? "إضافة إشارة مرجعية" : "Bookmark"}
            </span>
          </button>

          {!editingNote ? (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              data-testid="ayah-actions-open-note"
              className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-start transition-colors hover:bg-muted/60"
            >
              <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {note
                    ? language === "ar" ? "تعديل الملاحظة" : "Edit note"
                    : language === "ar" ? "إضافة ملاحظة" : "Add note"}
                </div>
                {note && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {note}
                  </p>
                )}
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === "ar" ? "ملاحظتك الخاصة" : "Your private note"}
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  language === "ar"
                    ? "اكتب ملاحظتك حول هذه الآية..."
                    : "Write your reflection on this ayah..."
                }
                className="min-h-[100px] text-sm"
                maxLength={2000}
                data-testid="ayah-actions-note-textarea"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                {note ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteNote()}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                    data-testid="ayah-actions-delete-note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {language === "ar" ? "حذف" : "Delete"}
                  </button>
                ) : <span />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingNote(false); setDraft(note); }}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveNote()}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    data-testid="ayah-actions-save-note"
                  >
                    {t("save")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleShare()}
            data-testid="ayah-actions-share"
            className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-start transition-colors hover:bg-muted/60"
          >
            <Share2 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{t("share")}</span>
          </button>
        </div>

        {/* Surah is unused in display body but referenced for accessibility only */}
        <span className="sr-only">{`surah:${surah}`}</span>
      </SheetContent>
    </Sheet>
  );
}
