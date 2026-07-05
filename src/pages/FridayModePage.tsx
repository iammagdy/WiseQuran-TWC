import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bell, BookOpen, CheckCircle2, HeartHandshake, Plus, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toArabicNumerals } from "@/lib/utils";
import { showAppNotification } from "@/lib/notifications";
import { cancelFridayReminderInSW } from "@/hooks/useFridayReminders";

function getFridayKey() {
  const today = new Date();
  const friday = new Date(today);
  friday.setDate(today.getDate() - ((today.getDay() + 2) % 7));
  const year = friday.getFullYear();
  const month = String(friday.getMonth() + 1).padStart(2, "0");
  const day = String(friday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function FridayModePage() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const fridayKey = getFridayKey();
  const [reminderEnabled, setReminderEnabled] = useLocalStorage<boolean>("wise-friday-reminder-enabled", true);
  const [salawatCounts, setSalawatCounts] = useLocalStorage<Record<string, number>>("wise-friday-salawat-counts", {});
  const [checklist, setChecklist] = useLocalStorage<Record<string, string[]>>("wise-friday-checklist", {});

  const salawatCount = salawatCounts[fridayKey] ?? 0;
  const checklistItems = useMemo(() => ([
    { id: "kahf", labelAr: "قراءة سورة الكهف", labelEn: "Read Surah Al-Kahf" },
    { id: "dua", labelAr: "الإكثار من الدعاء", labelEn: "Make extra dua" },
    { id: "jumuah", labelAr: "الاستعداد لصلاة الجمعة", labelEn: "Prepare for Jumu'ah prayer" },
  ]), []);

  const completedItems = checklist[fridayKey] ?? [];

  const toggleChecklist = (id: string) => {
    setChecklist((prev) => {
      const current = prev[fridayKey] ?? [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      return { ...prev, [fridayKey]: next };
    });
  };

  const bumpSalawat = () => {
    setSalawatCounts((prev) => ({ ...prev, [fridayKey]: (prev[fridayKey] ?? 0) + 1 }));
  };

  const resetSalawat = () => {
    setSalawatCounts((prev) => ({ ...prev, [fridayKey]: 0 }));
  };

  return (
    <div className="px-4 pt-6 pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-5 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="rounded-xl p-2.5 glass-card shadow-soft hover:bg-muted transition-colors" data-testid="friday-mode-back-button">
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold heading-decorated" data-testid="friday-mode-title">{language === "ar" ? "وضع الجمعة" : "Friday Mode"}</h1>
          <p className="text-sm text-muted-foreground">{language === "ar" ? "سورة الكهف، الصلاة على النبي ﷺ، وتذكيرات يوم الجمعة" : "Surah Al-Kahf, salawat, and Friday reminders."}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-2xl gradient-hero border border-primary/15 p-5 shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 pattern-islamic opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "جمعة مباركة" : "Blessed Friday"}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {language === "ar"
              ? "اجعل هذا اليوم مخصصًا للقرآن، الصلاة على النبي ﷺ، والدعاء، مع متابعة سهلة من مكان واحد."
              : "Use this page to keep Surah Al-Kahf, salawat, and your Friday checklist in one place."}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-2xl glass-card p-4 shadow-soft border border-border/50" data-testid="friday-mode-kahf-card">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "سورة الكهف" : "Surah Al-Kahf"}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{language === "ar" ? "افتح السورة مباشرة للقراءة أو المراجعة." : "Open the surah instantly for reading or review."}</p>
          <Button data-testid="friday-mode-open-kahf-button" className="w-full" onClick={() => navigate('/surah/18')}>
            {language === "ar" ? "افتح السورة" : "Open Surah"}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl glass-card p-4 shadow-soft border border-border/50" data-testid="friday-mode-reminder-card">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{language === "ar" ? "تذكير الجمعة" : "Friday Reminder"}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{language === "ar" ? "إشعار صباح الجمعة لفتح هذه الصفحة وقراءة الكهف." : "Friday morning reminder to open this page and read Al-Kahf."}</p>
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs text-muted-foreground">{reminderEnabled ? (language === "ar" ? "مفعّل" : "Enabled") : (language === "ar" ? "متوقف" : "Disabled")}</span>
            <button type="button" role="switch" aria-checked={reminderEnabled} onClick={() => setReminderEnabled((prev) => {
              const next = !prev;
              if (!next) void cancelFridayReminderInSW();
              return next;
            })} data-testid="friday-mode-reminder-toggle" className={`relative h-8 w-14 rounded-full transition-colors ${reminderEnabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <Button variant="outline" data-testid="friday-mode-test-reminder-button" className="w-full" onClick={() => showAppNotification(language === 'ar' ? 'تذكير الجمعة' : 'Friday Reminder', { body: language === 'ar' ? 'اقرأ سورة الكهف وأكثر من الصلاة على النبي ﷺ' : 'Read Surah Al-Kahf and increase salawat today.' })}>
            {language === "ar" ? "اختبار التذكير" : "Test Reminder"}
          </Button>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-2xl glass-card p-5 shadow-soft border border-border/50 mb-4" data-testid="friday-mode-salawat-card">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{language === "ar" ? "عداد الصلاة على النبي ﷺ" : "Salawat Counter"}</p>
        </div>
        <p className="text-4xl font-bold text-primary mb-3">{language === "ar" ? toArabicNumerals(salawatCount) : salawatCount}</p>
        <div className="flex gap-2">
          <Button data-testid="friday-mode-salawat-increment-button" className="flex-1 gap-2" onClick={bumpSalawat}><Plus className="h-4 w-4" />{language === "ar" ? "أضف" : "Add"}</Button>
          <Button data-testid="friday-mode-salawat-reset-button" variant="outline" className="gap-2" onClick={resetSalawat}><RotateCcw className="h-4 w-4" />{language === "ar" ? "إعادة" : "Reset"}</Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="rounded-2xl glass-card p-5 shadow-soft border border-border/50" data-testid="friday-mode-checklist-card">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{language === "ar" ? "قائمة الجمعة" : "Friday Checklist"}</p>
        </div>
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const checked = completedItems.includes(item.id);
            return (
              <button key={item.id} onClick={() => toggleChecklist(item.id)} data-testid={`friday-mode-checklist-${item.id}`} className={`w-full rounded-2xl border px-4 py-3 text-start transition-colors ${checked ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-card'}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{language === 'ar' ? item.labelAr : item.labelEn}</span>
                  <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>{checked ? '✓' : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}