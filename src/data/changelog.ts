export const APP_VERSION = "2.5.0";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  changesEn: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "2.5.0",
    date: "2026-03-16",
    changes: [
      "إصلاح مشكلة تداخل شعارات التثبيت والحفظ في أسفل الشاشة",
      "إصلاح نظام التسجيل والدخول للعمل بدون تأكيد البريد الإلكتروني",
      "تحسين رسائل الأخطاء في نظام المصادقة مع إضافة سجلات تفصيلية للمطورين",
      "إضافة التحقق من إنشاء الجلسة بعد التسجيل لضمان تسجيل الدخول التلقائي",
      "تحسين استقرار وموثوقية عملية إنشاء الحسابات الجديدة",
      "تحسين معالجة الأخطاء غير المتوقعة في نظام المصادقة",
    ],
    changesEn: [
      "Fixed UI overlap between install banner and save progress banner at the bottom of the screen",
      "Fixed sign up and sign in system to work without email confirmation requirement",
      "Improved authentication error messages with detailed developer logging",
      "Added session validation after signup to ensure automatic login works correctly",
      "Improved stability and reliability of new account creation process",
      "Enhanced error handling for unexpected errors in authentication system",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-03-15",
    changes: [
      "إصلاح حلقة لا نهائية في نظام الإنجازات كانت تُبطئ التطبيق",
      "إصلاح حلقة لا نهائية في تذكير القراءة اليومي كانت تستنزف بطارية الجهاز",
      "تحسين استقرار التطبيق بشكل عام عند استخدام الإنجازات والتذكيرات",
    ],
    changesEn: [
      "Fixed an infinite loop in the Achievements system that was slowing down the app",
      "Fixed an infinite loop in the daily reading reminder that was draining device battery",
      "Improved overall app stability when using Achievements and Reminders",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-03-14",
    changes: [
      "إضافة تبويب «ترجمة» مستقل في صفحة قراءة السورة",
      "دعم أكثر من ١٢ ترجمة لمعاني القرآن (Sahih International، يوسف علي، بكثال، وأخرى)",
      "تحسين تسمية قسم الترجمة في الإعدادات بعنوان ثنائي اللغة (Translation)",
      "تحسين مناطق اللمس في جميع الأزرار لتصل إلى ٤٤ بكسل كحد أدنى",
      "إصلاح عرض ثابت في صفحة التسبيح يتسبب في تجاوز الحد على الشاشات الصغيرة",
      "إصلاح تعارض المسافات البادئة في صفحة التسبيح",
      "إصلاح اقتطاع النص في بطاقة متابعة القراءة وشريط تشغيل السورة",
      "تحسين شبكة الإحصائيات في صفحة الحفظ لتناسب الشاشات الضيقة (٣٢٠ بكسل)",
    ],
    changesEn: [
      "Added a separate Translation tab in the Surah reader",
      "Support for 12+ Quran translations (Sahih International, Yusuf Ali, Pickthall, and more)",
      "Improved Translation section label in Settings to be bilingual",
      "Fixed touch targets across all buttons to meet the 44px minimum size",
      "Fixed a hardcoded width in Tasbeeh that overflowed on small screens",
      "Fixed padding conflicts in the Tasbeeh counter page",
      "Fixed text truncation in the Continue Reading card and Surah bottom bar",
      "Improved Hifz stats grid to fit narrow screens (320px)",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-03-12",
    changes: [
      "إصلاح ظهور زر الإغلاق (X) مكرراً في شاشة التشغيل والإنجازات وسجل التحديثات",
      "تحسين مظهر شاشة التشغيل الكاملة بحركة انتقال سلسة من الأسفل",
      "تكبير زر إغلاق رسالة التثبيت ليكون واضحاً وسهل الضغط",
      "إضافة زر إغلاق دائم في وضع التركيز حتى لا يختفي عن المستخدم",
    ],
    changesEn: [
      "Fixed duplicate close (X) button appearing in the Now Playing screen, Achievements, and Changelog",
      "Improved the Now Playing full-screen appearance with a smooth slide-up transition",
      "Made the install banner close button larger and easier to tap",
      "Added a persistent close button in Focus Mode so it never disappears",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-03-12",
    changes: [
      "طلب صلاحية الموقع فقط عند استخدام أداة القبلة",
      "إظهار رسالة واضحة عند التحقق من التحديثات",
      "تكبير الأيقونات والخطوط في شريط التنقل السفلي",
      "تحسينات عامة في سهولة الاستخدام",
    ],
    changesEn: [
      "Location permission is now only requested when using the Qibla tool",
      "Added a clear message when checking for updates",
      "Larger icons and labels in the bottom navigation bar",
      "General usability improvements",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-03-12",
    changes: [
      "شاشة تشغيل جديدة مع عرض اسم السورة والقارئ وأزرار التحكم",
      "عرض الآيات أثناء التلاوة مع تمييز الآية الحالية",
      "تحسين تحميل التلاوات والتأكد من نجاح الحفظ قبل إظهار رسالة النجاح",
      "زر للتحقق من التلاوات المحمّلة وإصلاح الملفات غير المكتملة",
      "تحسين تثبيت التطبيق على أجهزة أندرويد",
      "إصلاحات عامة في الأداء والمظهر",
    ],
    changesEn: [
      "New Now Playing screen showing surah name, reciter, and playback controls",
      "Verse-by-verse display during recitation with current verse highlighted",
      "Improved audio download reliability with success confirmation before showing a notification",
      "Added a button to verify downloaded recitations and repair incomplete files",
      "Improved app installation on Android devices",
      "General performance and visual fixes",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-03-10",
    changes: [
      "نظام تحديث تلقائي ذكي للتطبيق",
      "زر مشاركة التطبيق مع الأصدقاء",
      "بطاقة المطوّر بتصميم رمضاني",
      "عرض رقم الإصدار وسجل التحديثات",
      "التحقق اليدوي من التحديثات",
    ],
    changesEn: [
      "Smart automatic app update system",
      "Share the app with friends button",
      "Developer card with Ramadan-themed design",
      "Version number display and changelog viewer",
      "Manual update check button",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-01",
    changes: [
      "الإصدار الأول من التطبيق",
      "قراءة القرآن الكريم مع البحث والعلامات",
      "الأذكار والأدعية مع عدّاد التكرار",
      "مواقيت الصلاة واتجاه القبلة",
      "الوضع الليلي والتحكم بحجم الخط",
      "تحميل القرآن والتلاوات للاستخدام بدون إنترنت",
    ],
    changesEn: [
      "First release of the app",
      "Quran reading with search and bookmarks",
      "Azkar and Duas with repetition counter",
      "Prayer times and Qibla direction",
      "Dark mode and font size controls",
      "Offline Quran text and audio downloads",
    ],
  },
];
