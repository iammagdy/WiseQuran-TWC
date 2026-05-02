import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, MoreVertical } from "lucide-react";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface InstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InstallModal({ open, onOpenChange }: InstallModalProps) {
  const { t, language, isRTL } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95%] rounded-3xl p-0 border-white/5 bg-background shadow-3xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            {t("install_app")}
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {language === "ar" ? "ثبّت التطبيق على شاشتك الرئيسية للوصول السريع" : "Install the app to your home screen for quick access"}
          </DialogDescription>
        </div>

        <Tabs defaultValue="ios" className="w-full flex flex-col flex-1 min-h-0">
          {/* Tab bar */}
          <div className="px-6 pb-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger value="ios" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold">
                {language === "ar" ? "iOS (سافاري)" : "iOS (Safari)"}
              </TabsTrigger>
              <TabsTrigger value="android" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold">
                {language === "ar" ? "أندرويد (كروم)" : "Android (Chrome)"}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* iOS */}
          <TabsContent value="ios" className="focus-visible:outline-none flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5">
            {/* Taller aspect ratio and object-contain to ensure full phone screen visibility */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-muted/20 shadow-inner w-full aspect-[4/5] relative">
              {/* Phase D: serve AVIF / WebP first, fall back to the
                  original JPG so older browsers still see the asset. */}
              <picture>
                <source srcSet="/ios_install_guide.avif" type="image/avif" />
                <source srcSet="/ios_install_guide.webp" type="image/webp" />
                <img
                  src="/ios_install_guide.jpg"
                  alt="iOS Install Guide"
                  width={800}
                  height={1000}
                  className="absolute inset-0 w-full h-full object-contain p-2"
                />
              </picture>
            </div>

            <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
              {/* Step 1 */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-white/5">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm text-sm">
                  {language === "ar" ? toArabicNumerals(1) : 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {language === "ar" ? "اضغط على أيقونة المشاركة" : "Tap the Share icon"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {language === "ar" ? "تجدها في شريط أدوات متصفح سافاري في الأسفل" : "Located in the Safari browser toolbar at the bottom"}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-white/5">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm text-sm">
                  {language === "ar" ? toArabicNumerals(2) : 2}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {language === "ar" ? "اختر 'إضافة إلى الصفحة الرئيسية'" : "Select 'Add to Home Screen'"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {language === "ar" ? "قم بالتمرير لأسفل في قائمة المشاركة لتجد الخيار" : "Scroll down the share menu to find the option"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Android */}
          <TabsContent value="android" className="focus-visible:outline-none flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5">
            {/* Taller aspect ratio and object-contain to ensure full phone screen visibility */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-muted/20 shadow-inner w-full aspect-[4/5] relative">
              <picture>
                <source srcSet="/android_install_guide.avif" type="image/avif" />
                <source srcSet="/android_install_guide.webp" type="image/webp" />
                <img
                  src="/android_install_guide.jpg"
                  alt="Android Install Guide"
                  width={800}
                  height={1000}
                  className="absolute inset-0 w-full h-full object-contain p-2"
                />
              </picture>
            </div>

            <div className="space-y-3" dir={isRTL ? "rtl" : "ltr"}>
              {/* Step 1 */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-white/5">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm text-sm">
                  {language === "ar" ? toArabicNumerals(1) : 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm mb-2">{language === "ar" ? "افتح قائمة المتصفح" : "Open Browser Menu"}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {language === "ar" ? "اضغط على القائمة" : "Tap the menu icon"}
                    </p>
                    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-xl px-2 py-1.5 text-xs font-bold border border-primary/20 shadow-sm">
                      <MoreVertical className="h-5 w-5" />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "في أعلى يمين كروم" : "in Chrome's top-right"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-white/5">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 shadow-sm text-sm">
                  {language === "ar" ? toArabicNumerals(2) : 2}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm mb-2">{language === "ar" ? "تثبيت التطبيق" : "Install the App"}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {language === "ar"
                      ? "اضغط على 'تثبيت التطبيق' (Install app) أو 'إضافة إلى الشاشة الرئيسية'"
                      : "Tap 'Install app' or 'Add to Home screen' to finish installation"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
