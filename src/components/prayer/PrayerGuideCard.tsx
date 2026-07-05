import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Droplets, HandHelping, Volume2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const WUDU_STEPS_AR = [
  "النية في القلب والتسمية (بسم الله)",
  "غسل الكفين ثلاث مرات",
  "المضمضة والاستنشاق ثلاث مرات",
  "غسل الوجه ثلاث مرات",
  "غسل اليد اليمنى إلى المرفق ثلاثًا، ثم اليسرى كذلك",
  "مسح الرأس كله مرة واحدة (من المقدمة إلى القفا ثم الرجوع)",
  "مسح الأذنين مرة واحدة",
  "غسل القدم اليمنى إلى الكعبين ثلاثًا، ثم اليسرى كذلك",
];

const WUDU_STEPS_EN = [
  "Make intention in the heart and say Bismillah",
  "Wash both hands three times",
  "Rinse the mouth and nose three times",
  "Wash the face three times",
  "Wash the right arm up to the elbow three times, then the left",
  "Wipe the entire head once (front to back and back)",
  "Wipe the ears once",
  "Wash the right foot up to the ankles three times, then the left",
];

const PRAYER_STEPS_AR = [
  "استقبل القبلة وانوِ الصلاة في قلبك",
  "كبّر تكبيرة الإحرام رافعًا يديك حذو منكبيك: «الله أكبر»",
  "ضع يدك اليمنى على اليسرى على صدرك واقرأ دعاء الاستفتاح",
  "تعوّذ بالله من الشيطان ثم اقرأ البسملة والفاتحة وما تيسر من القرآن",
  "كبّر واركع واجعل ظهرك مستويًا وقل: «سبحان ربي العظيم» ثلاثًا",
  "ارفع من الركوع قائلًا: «سمع الله لمن حمده» ثم قل: «ربنا ولك الحمد»",
  "كبّر واسجد على سبعة أعضاء وقل: «سبحان ربي الأعلى» ثلاثًا",
  "اجلس بين السجدتين وقل: «ربِّ اغفر لي» ثم اسجد الثانية مثل الأولى",
  "قم للركعة الثانية وافعل كما في الأولى",
  "في التشهد الأخير: اقرأ التشهد والصلاة الإبراهيمية",
  "سلّم عن يمينك ثم عن يسارك: «السلام عليكم ورحمة الله»",
];

const PRAYER_STEPS_EN = [
  "Face the Qibla and make intention in your heart",
  "Say the opening takbeer raising hands to shoulders: «Allahu Akbar»",
  "Place right hand over left on the chest and recite the opening supplication",
  "Seek refuge from Shaytan, then recite Bismillah, Al-Fatiha, and additional verses",
  "Say Allahu Akbar, bow (ruku') with back straight, say «Subhana Rabbiyal Adheem» three times",
  "Rise from ruku' saying «Sami Allahu liman hamidah», then «Rabbana wa lakal hamd»",
  "Say Allahu Akbar and prostrate on seven bones, say «Subhana Rabbiyal A'la» three times",
  "Sit between the two prostrations and say «Rabbigh-firli», then perform the second prostration",
  "Rise for the second rak'ah and repeat as in the first",
  "In the final tashahhud: recite Tashahhud and the Ibrahimi prayer",
  "Say salam to the right then to the left: «Assalamu Alaikum wa Rahmatullah»",
];

interface PrayerInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  count: number;
  icon: string;
  mode: "loud" | "silent";
}

const PRAYER_INFO: PrayerInfo[] = [
  { id: "fajr",   nameAr: "الفجر",  nameEn: "Fajr",    count: 2, icon: "🌅", mode: "loud" },
  { id: "dhuhr",  nameAr: "الظهر",  nameEn: "Dhuhr",   count: 4, icon: "☀️", mode: "silent" },
  { id: "asr",    nameAr: "العصر",  nameEn: "Asr",     count: 4, icon: "🌤",  mode: "silent" },
  { id: "maghrib",nameAr: "المغرب", nameEn: "Maghrib", count: 3, icon: "🌅", mode: "loud" },
  { id: "isha",   nameAr: "العشاء", nameEn: "Isha",    count: 4, icon: "🌙", mode: "loud" },
];

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  isRTL: boolean;
}

function GuideSection({ icon, title, children, isRTL }: SectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
        <span className={cn("flex-1 font-bold text-sm", isRTL ? "text-right" : "text-left")}>{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="px-3 pb-3 pt-1"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PrayerGuideCard() {
  const { t, language, isRTL } = useLanguage();

  const wuduSteps = language === "ar" ? WUDU_STEPS_AR : WUDU_STEPS_EN;
  const prayerSteps = language === "ar" ? PRAYER_STEPS_AR : PRAYER_STEPS_EN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card p-4 shadow-soft border border-border/50"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <h2 className="text-center text-lg font-bold mb-3">{t("prayer_guide_title")}</h2>

      <div className="space-y-1">
        <GuideSection icon={<Droplets className="h-4 w-4" />} title={t("wudu_guide")} isRTL={isRTL}>
          <ol className="space-y-2 ps-1">
            {wuduSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection icon={<HandHelping className="h-4 w-4" />} title={t("prayer_steps_guide")} isRTL={isRTL}>
          <ol className="space-y-2 ps-1 mb-4">
            {prayerSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.625rem] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-bold text-center mb-2">{t("rakat_count_label")}</p>
            <div className="flex justify-around">
              {PRAYER_INFO.map((p) => (
                <div key={p.id} className="text-center">
                  <p className="text-lg font-bold text-primary">{p.count}</p>
                  <p className="text-[0.625rem] text-muted-foreground">{language === "ar" ? p.nameAr : p.nameEn}</p>
                </div>
              ))}
            </div>
          </div>
        </GuideSection>

        <GuideSection icon={<Volume2 className="h-4 w-4" />} title={t("recitation_guide")} isRTL={isRTL}>
          <p className="text-xs text-muted-foreground mb-3 text-center">
            {t("recitation_guide_desc")}
          </p>
          <div className="space-y-2">
            {PRAYER_INFO.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-2.5 text-sm",
                  p.mode === "loud" ? "bg-primary/5" : "bg-muted/50"
                )}
              >
                <span className="text-lg">{p.icon}</span>
                <span className={cn("flex-1 font-semibold", isRTL ? "text-right" : "text-left")}>
                  {language === "ar" ? p.nameAr : p.nameEn}
                </span>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  p.mode === "loud"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {p.mode === "loud" ? t("mode_loud") : t("mode_silent")}
                </span>
              </div>
            ))}
          </div>
        </GuideSection>
      </div>

      <p className="mt-3 text-center text-[0.625rem] text-muted-foreground">
        {t("prayer_source")}
      </p>
    </motion.div>
  );
}
