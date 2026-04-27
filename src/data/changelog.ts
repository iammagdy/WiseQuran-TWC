export const APP_VERSION = "3.9.1";

export interface ChangelogCategory {
  features?: string[];
  improvements?: string[];
  fixes?: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  ar: ChangelogCategory;
  en: ChangelogCategory;
}

export const changelog: ChangelogEntry[] = [
  {
    version: "3.9.1",
    date: "2026-04-27",
    ar: {
      improvements: [
        "تم إزالة تسجيل الدخول وإنشاء الحساب بالكامل من التطبيق. يبقى التطبيق محلياً على جهازك بالكامل، دون أي حسابات أو مزامنة سحابية.",
        "إعدادات الحساب وأزرار الدخول/الخروج تمت إزالتها من شاشة الإعدادات.",
      ],
    },
    en: {
      improvements: [
        "Sign-in and sign-up have been removed entirely. The app is now fully on-device — no accounts, no cloud sync.",
        "The Account section and Sign In / Sign Out buttons have been removed from Settings.",
      ],
    },
  },
  {
    version: "3.9.0",
    date: "2026-04-27",
    ar: {
      features: [
        "وضع النوم أصبح يعمل بدون إنترنت بالكامل: السور المحفوظة في جهازك تُشغَّل مباشرة من التخزين المحلي، حتى في الطائرة أو في وضع الطيران، ودون أي استهلاك للبيانات.",
        "زر «تحميل كل القرآن لهذا القارئ» داخل وضع النوم — تنزّل المصحف كاملاً بصوت قارئك المفضّل بضغطة واحدة، مع شريط تقدّم وإمكانية الإلغاء في أي لحظة.",
        "تظهر الآن علامة ✓ صغيرة بجانب كل سورة محفوظة بدون اتصال داخل قائمة سور وضع النوم، وزر تنزيل سريع لكل سورة على حدة.",
      ],
      improvements: [
        "بطاقة القارئ تعرض الآن عدّاد «س / ١١٤» يبيّن كم سورة تم حفظها لكل قارئ، حتى تعرف من بين القرّاء جاهزٌ للاستخدام بدون إنترنت.",
        "عند تشغيل سورة لأوّل مرة على الإنترنت، يحفظها التطبيق تلقائياً في الخلفية ليجدها وضع النوم في المرة التالية بدون تحميل جديد.",
        "عند أوّل تنزيل لوضع النوم، نطلب من النظام تثبيت التخزين الدائم (خصوصاً مهم على آيفون) حتى لا تُحذف ملفاتك بعد ٧ أيام من عدم الاستخدام.",
      ],
      fixes: [
        "إذا كنت بدون اتصال وحاولت تشغيل سورة غير محفوظة، تظهر الآن رسالة واضحة وودودة بدلاً من خطأ غامض في تحميل الصوت.",
      ],
    },
    en: {
      features: [
        "Sleep Mode now works fully offline: any surah you've downloaded plays straight from on-device storage, even in airplane mode and with zero data usage.",
        "New “Download whole Quran for this reciter” button inside Sleep Mode — fetches all 114 surahs in your preferred reciter's voice with one tap, with a live progress bar and one-tap cancel.",
        "Each surah in the Sleep Mode picker now shows a small ✓ when it's saved offline, plus a tiny per-surah download button so you can pin individual surahs without leaving the screen.",
      ],
      improvements: [
        "The reciter list now shows a “n / 114” counter on each reciter so you can see at a glance which voices are ready to play without internet.",
        "When you play a surah online for the first time, the app quietly caches it in the background so the next Sleep session uses the local copy with no re-download.",
        "On your first Sleep-Mode download we ask the OS to mark the storage as persistent — important on iPhone so your files aren't wiped after 7 days of inactivity.",
      ],
      fixes: [
        "If you go to play a surah while offline and it isn't downloaded yet, you now see a clear, friendly “not downloaded” message instead of a confusing audio error.",
      ],
    },
  },
  {
    version: "3.8.1",
    date: "2026-04-27",
    ar: {
      fixes: [
        "تم إصلاح عدم عمل وضع النوم على أجهزة آيفون (خصوصاً عند تثبيت التطبيق على الشاشة الرئيسية): أصبح يستخدم نفس مسار الصوت الآمن المستعمل في وضع الاستماع، مع تهيئة عناصر iOS الضرورية (playsinline، وفك القفل الصامت داخل لمسة المستخدم).",
      ],
    },
    en: {
      fixes: [
        "Fixed Sleep Mode not working on iPhone (especially when the app is installed to the Home Screen): it now goes through the same iOS-safe audio pipeline as Listening, with the required playsinline attributes and a silent unlock that completes inside the user gesture.",
      ],
    },
  },
  {
    version: "3.8.0",
    date: "2026-04-19",
    ar: {
      improvements: [
        "تنسيق صفحة القبلة أصبح يُظهر رسالة لطيفة مع مؤشر تحميل أثناء تحديد موقعك بدلاً من شاشة فارغة",
        "شاشة الترحيب وصور دليل التثبيت أصبحت تحجز مساحتها مسبقاً، فلن تقفز العناصر أثناء التحميل",
        "نقطة المزامنة في شريط التنقل السفلي أصبح يقرؤها قارئ الشاشة بوضوح، مع موضع أنيق بالعربية والإنجليزية",
        "صفحة اختبار التلاوة أصبحت بالكامل بلغة التطبيق المختارة (تخطي، جاري التقييم، نتيجة الآية)",
        "صفحة الصلاة تعرض ملخص الصلوات المكتملة بصياغة طبيعية بدل المسافة الزائدة بين الرقم والنص",
        "تنبيه «أدخل رقمًا بين ١ و ٦٠٤» في القارئ أصبح يستخدم الترجمة المركزية بأرقام عربية صحيحة",
        "حلّت أدوات Tailwind المنطقية (ms/me/ps/pe وtext-start/end) محل ml/mr/pl/pr وtext-left/right في كل صفحات وعناصر التطبيق، فيعرض التخطيط بشكل صحيح في الاتجاهين",
        "أضفنا أداة formatNumber موحّدة و«حارس» بسيط للتأكد من أن كل نص جديد ثنائي اللغة قبل الإطلاق",
      ],
    },
    en: {
      improvements: [
        "The Qibla screen now shows a friendly spinner and copy while we detect your location, instead of a blank panel",
        "The splash screen and install-guide images now reserve their space ahead of time, so nothing jumps as the page loads",
        "The settings sync dot in the bottom tab bar is now announced by screen readers and sits cleanly in both Arabic and English layouts",
        "The recitation test fully follows your selected language (Skip, Evaluating, per-ayah result label)",
        "The prayer page renders the daily completion summary as a single, natural sentence — no more stray space between the number and the label",
        "The Surah reader's “Enter a number between 1 and 604” toast now uses a central translation with correct Arabic-Indic digits",
        "Swept the app over to logical Tailwind utilities (ms/me/ps/pe and text-start/end) so layouts mirror correctly in RTL without per-component overrides",
        "Added a shared formatNumber helper and a soft bilingual-coverage check that flags new untranslated strings during development",
      ],
    },
  },
  {
    version: "3.7.0",
    date: "2026-04-19",
    ar: {
      improvements: [
        "بطاقات الصفحة الرئيسية تعرض الآن دعوة لطيفة لبدء وردك أو سلسلتك أو إضافة علامة بدلاً من الرقم صفر الفارغ",
        "أيقونة شريط التنقل السفلي تضيء الآن في وضع النوم وصفحة الحفظ وأدوات المطورين",
        "صفحة قراءة السورة تعرض اسم السورة بأرقام عربية عند الحاجة، ويظهر التفسير بالاتجاه الصحيح حسب لغته",
        "وضع النوم وصفحة اختبار التلاوة وصفحة الإعدادات أصبحت تستخدم الأرقام والرمز العربي للنسبة المئوية (٪)",
        "نسّقنا المسافات في بطاقة آية اليوم وشريط الصوت لتظهر متوازنة بالعربية والإنجليزية، مع هيكل تحميل مطابق لحجم البطاقة الفعلي",
        "رسائل التنبيه الخاصة بحفظ الملاحظة وتحميل السورة أصبحت تظهر بلغة التطبيق المختارة دائماً",
        "زر التثبيت لم يعد يظهر على أجهزة الكمبيوتر أو داخل تطبيقات فيسبوك وإنستغرام وتويتر وتيك توك",
      ],
    },
    en: {
      improvements: [
        "Empty home cards now show a friendly nudge to start your wird, build a streak, or add a bookmark instead of a bare 0",
        "The bottom tab bar now lights up the right icon for Sleep Mode, the Hifz screen, and developer tools",
        "The Surah reader shows the surah name in Arabic-Indic digits when needed, and tafsir text now reads in its own language direction",
        "Sleep Mode, the recitation test, and Settings now use Arabic-Indic digits and the Arabic percent symbol (٪) when in Arabic",
        "Tightened spacing on the Daily Ayah card and the audio player so layouts look balanced in both languages, with a loading skeleton that matches the real card",
        "Note-saved and Surah-download messages now follow your selected language everywhere",
        "The install prompt no longer shows on desktop browsers or inside in-app browsers like Facebook, Instagram, Twitter, and TikTok",
      ],
    },
  },
  {
    version: "3.6.1",
    date: "2026-04-19",
    ar: {
      fixes: [
        "إصلاح الشاشة البيضاء التي كانت تظهر أحياناً عند فتح التطبيق — كل الصفحات تفتح الآن بشكل سليم",
        "فتح روابط التطبيق مباشرةً من المتصفح أصبح يعمل بدون أي خطأ",
      ],
    },
    en: {
      fixes: [
        "Fixed the blank white screen that sometimes appeared when opening the app — every page now opens normally",
        "Opening app links directly from the browser now works without any errors",
      ],
    },
  },
  {
    version: "3.6.0",
    date: "2026-04-17",
    ar: {
      improvements: [
        "تحسينات في الأداء خلف الكواليس لتجربة أسرع وأخف",
        "صور دليل التثبيت ولقطات الشاشة أصبحت أصغر حجماً وأوضح، فيُفتح التطبيق ويُثبَّت بشكل أسرع",
        "تنظيف داخلي للكود لتقليل حجم التطبيق وتسريع التحميل",
        "نحن نعمل باستمرار على تحسين هذا التطبيق وصيانته — التحديثات والإصلاحات لا تتوقف أبداً",
      ],
    },
    en: {
      improvements: [
        "Behind-the-scenes performance tuning for a faster, lighter experience",
        "Install guide images and PWA screenshots are now smaller and sharper, so installing the app is quicker",
        "Internal cleanup to reduce the app size and speed up loading",
        "We are always working on this app, fixing and improving it — updates never stop",
      ],
    },
  },
  {
    version: "3.5.0",
    date: "2026-04-16",
    ar: {
      improvements: [
        "تصفّح القرآن والتفسير أصبح أسرع وأسلس — الصفحات الطويلة مثل سورة البقرة تُعرض بدون أي تعثّر",
        "لا تضيع بياناتك عند انقطاع الإنترنت — تُحفظ تلقائياً وتُزامَن بهدوء عند العودة للإنترنت",
        "الانتقال إلى آية بعيدة يُضيء الآية المقصودة بتأثير خفيف حتى تعرف دائماً أين وصلت",
        "مشغّل الصوت أكثر توفيراً للبطارية — أداؤه نفسه، لكنه يستهلك طاقة أقل في الخلفية",
        "اختصارات الشاشة الرئيسية محسّنة مع لقطات شاشة واضحة عند تثبيت التطبيق",
        "نحن نعمل باستمرار على تحسين هذا التطبيق وصيانته — التحديثات والإصلاحات لا تتوقف أبداً",
      ],
    },
    en: {
      improvements: [
        "Browsing the Quran and Tafsir is now much faster — long surahs like Al-Baqarah scroll without any slowdown",
        "Your data is never lost offline — it saves automatically and syncs quietly when your connection returns",
        "Jumping to a faraway ayah now highlights it with a gentle glow so you always know exactly where you are",
        "The audio player is easier on your battery — same smooth experience, less power used in the background",
        "Improved home screen shortcuts and a better install experience with clear screenshots",
        "We are always working on this app, fixing and improving it — updates never stop",
      ],
    },
  },
  {
    version: "3.4.0",
    date: "2026-03-27",
    ar: {
      features: [
        "إضافة وضع الجمعة الكامل مع مركز مخصص يضم سورة الكهف، تذكير الجمعة، عداد الصلاة على النبي ﷺ، وقائمة متابعة",
      ],
      improvements: [
        "توسيع خطة الحفظ لتشمل نظرة أسبوعية للمراجعة مع اقتراح يومي أوضح",
        "تقارير التسميع أصبحت أغنى بإحصاءات تفصيلية كمتوسط الثقة وأفضل آية وأضعفها وأكثر الكلمات تعثراً",
      ],
      fixes: [
        "تقارير التسميع تعمل الآن بشكل صحيح حتى بدون اتصال بالإنترنت",
      ],
    },
    en: {
      features: [
        "Added a full Friday Mode hub with Surah Al-Kahf, Friday reminders, a salawat counter, and a guided checklist",
      ],
      improvements: [
        "Expanded Hifz planning with a clearer weekly revision overview and daily recommendation",
        "Recitation reports now show richer stats — average confidence, strongest and weakest ayah, and the words you struggle with most",
      ],
      fixes: [
        "Recitation reports now work correctly even without an internet connection",
      ],
    },
  },
  {
    version: "3.3.1",
    date: "2026-03-27",
    ar: {
      features: [
        "إضافة صفحة تشخيص لمستخدمي iPhone للتحقق السريع من إعدادات الصوت والميكروفون والإشعارات",
        "إضافة مركز بدون إنترنت لتحميل نصوص القرآن وصوت القارئ الحالي وإدارة التخزين بسهولة",
      ],
      improvements: [
        "إضافة بطاقات منفصلة في الصفحة الرئيسية لمتابعة القراءة والاستماع بسرعة",
        "إضافة تخصيصات قراءة جديدة مثل تباعد السطور، لون النص، ووضع التركيز الهادئ",
        "تحسين لوحة الإحصائيات ببطاقة هدف أسبوعي وملخص أساسي لتقدم الحفظ",
      ],
      fixes: [
        "تحسين صفحة التسميع — يمكنك الآن ضبط مدة الانتظار قبل التقييم، وإعادة تدريب الأجزاء التي واجهت فيها صعوبة فقط",
      ],
    },
    en: {
      features: [
        "Added a diagnostics page for iPhone users to quickly check audio, microphone, and notification settings",
        "Added an Offline Center for downloading Quran text and reciter audio so you can use the app without internet",
      ],
      improvements: [
        "Added separate home quick-resume cards for reading and listening",
        "Added new reader personalization controls for line spacing, text tone, and a calmer focus preset",
        "Enhanced the Stats dashboard with a weekly goal card and a basic memorization snapshot",
      ],
      fixes: [
        "Improved the recitation page — you can now adjust how long the app waits before scoring, and re-practice only the parts you struggled with",
      ],
    },
  },
  {
    version: "3.3.0",
    date: "2026-03-19",
    ar: {
      improvements: [
        "التطبيق يفتح أسرع من أي وقت مضى — التحميل الأول أصبح أخف وأسرع بشكل ملحوظ",
        "صفحة الإعدادات تُحمَّل بشكل أسرع وبأداء أخف",
      ],
      fixes: [
        "إزالة تبويب رمضان من شريط التنقل مؤقتاً — سيعود في تحديث قادم",
        "تحسين سلاسة التنقل بين الصفحات بعد تحديث شريط التبويب",
      ],
    },
    en: {
      improvements: [
        "The app opens faster than ever — startup is noticeably quicker on every visit",
        "The Settings page loads more quickly and uses less memory",
      ],
      fixes: [
        "Removed the Ramadan tab from the navigation bar for now — it will return in a future update",
        "Navigation flow updated to stay smooth and consistent after the tab change",
      ],
    },
  },
  {
    version: "3.2.1",
    date: "2026-03-18",
    ar: {
      fixes: [
        "🔧 إصلاح دعم متصفح Safari على iPhone",
        "🎙️ ميزة التسميع تعمل الآن على iPhone",
        "🔊 إصلاح تشغيل الأذان على iPhone",
      ],
    },
    en: {
      fixes: [
        "🔧 Fixed Safari support on iPhone",
        "🎙️ Recitation now works on iPhone",
        "🔊 Fixed Azan playback on iPhone",
      ],
    },
  },
  {
    version: "3.2.0",
    date: "2026-03-18",
    ar: {
      features: [
        "إعادة بناء نظام الصوت بالكامل — تشغيل القرآن والأذان والتذكيرات يعمل بشكل موثوق على جميع الأجهزة",
      ],
      improvements: [
        "الصوت جاهز للتشغيل على Android وiPhone فور أول لمسة داخل التطبيق",
        "تذكيرات الصلاة والأذكار وورد القراءة أصبحت أكثر موثوقية — تصلك حتى عندما يكون التطبيق يعمل في الخلفية",
        "الأذان يُشغَّل حتى مع اتصال ضعيف أو متقطع — ملفاته محفوظة على جهازك مسبقاً",
      ],
      fixes: [
        "إصلاح مشكلة تشغيل صوت القرآن التي توقفت عن العمل بشكل صحيح على الهاتف",
        "إصلاح أصوات الأذان والتذكيرات التي كانت تفشل في التشغيل على Android وiPhone",
        "إذا فاتك إشعار صلاة أثناء توقف الهاتف، يعرضه التطبيق تلقائياً عند فتحه مجدداً",
      ],
    },
    en: {
      features: [
        "Rebuilt the audio system from the ground up — Quran playback, Adhan, and reminders now all work together reliably on every device",
      ],
      improvements: [
        "Audio is now ready to play on Android and iPhone from the moment you first tap anything in the app",
        "Prayer times, azkar, and reading reminders are more reliable — they reach you even when the app is running in the background",
        "The Adhan now plays even with a slow or unstable connection — audio files are saved locally on your device",
      ],
      fixes: [
        "Fixed Quran audio playback that had stopped working correctly on mobile",
        "Fixed Adhan and reminder sounds that were failing to play on Android and iPhone",
        "If you missed a prayer notification while your phone was idle, the app now shows it when you open it again",
      ],
    },
  },
  {
    version: "3.1.0",
    date: "2026-03-17",
    ar: {
      fixes: [
        "إصلاح فشل تشغيل الصوت على أجهزة iPhone — يعمل الآن بسلاسة على Safari",
        "إصلاح بوصلة القبلة التي كانت تدور مع الهاتف — الشاشة ثابتة والإبرة فقط تتحرك",
        "إصلاح مشكلة في تسجيل الدخول كانت تؤثر على بعض المستخدمين، مع رسائل أوضح عند حدوث أي خطأ",
      ],
      improvements: [
        "التحديث التلقائي الفوري عند اكتشاف إصدار جديد بدون تدخل يدوي",
        "الصفحات تُحمَّل بشكل أسرع — التطبيق يُحمِّل فقط ما تحتاجه عندما تحتاجه",
        "بوصلة القبلة أكثر سلاسة وطبيعية في الحركة",
      ],
    },
    en: {
      fixes: [
        "Fixed audio playback failure on iPhone — now works smoothly on Safari",
        "Fixed the Qibla compass spinning with the phone — the screen stays still, only the needle moves",
        "Fixed a sign-in issue that was affecting some users, with clearer messages when something goes wrong",
      ],
      improvements: [
        "Automatic instant updates — app updates immediately when a new version is detected",
        "Pages load much faster — the app only loads what you need, when you need it",
        "The Qibla compass moves more smoothly and feels more natural to use",
      ],
    },
  },
  {
    version: "3.0.0",
    date: "2026-03-17",
    ar: {
      features: [
        "جميع الأزرار والعناصر أصبحت أكبر وأسهل للضغط — لا مزيد من الضغط الخاطئ على العناصر الصغيرة",
        "تحسين تجربة الاستخدام للمستخدمين ذوي الإعاقات الحركية من خلال مناطق لمس أوسع وأسهل",
      ],
      improvements: [
        "تم تكبير أزرار التحكم في مشغل الصوت (إيقاف، نسخ، اختيار السرعة)",
        "أزرار التنقل والتحكم في جميع أنحاء التطبيق أصبحت أسهل للضغط",
        "توسيع مناطق الضغط للعناصر الصغيرة مع الحفاظ على حجم الرموز البصري",
      ],
      fixes: [
        "إصلاح أكثر من 20 زراً وعنصراً كانت صغيرة جداً ويصعب الضغط عليها بدقة",
        "الأزرار في جميع أنحاء التطبيق أصبحت بحجم موحد ومتناسق",
      ],
    },
    en: {
      features: [
        "All buttons and controls are now larger and easier to tap — no more accidentally missing small targets",
        "Improved usability for users with motor impairments through larger, easier-to-tap areas throughout the app",
      ],
      improvements: [
        "Increased audio player control sizes (stop button, copy button, speed selector)",
        "All navigation and control buttons across the app are now easier to tap",
        "Expanded clickable areas for small elements while preserving icon visual size",
      ],
      fixes: [
        "Fixed over 20 buttons and controls that were too small to tap comfortably",
        "Buttons are now a consistent size throughout the app",
      ],
    },
  },
  {
    version: "2.9.0",
    date: "2026-03-17",
    ar: {
      features: [
        "إعادة تصميم شاملة لاختبار التلاوة: الآيات مخفية وتظهر تدريجياً عند التسميع من الذاكرة",
        "نظام الاستماع الذكي: التقييم التلقائي وبدء الآية التالية بدون تدخل يدوي (تسميع متواصل)",
      ],
      improvements: [
        "الأرقام تظهر بصيغتها العربية (١٢٣) في جميع أنحاء التطبيق عند استخدام الواجهة العربية",
        "تحسين رؤية الآيات القادمة بإطارات رمادية مميزة في الوضع الليلي",
        "إضافة زر الرجوع المفقود في صفحات الأذكار والصلوات لتحسين التنقل",
      ],
      fixes: [
        "شريط الميكروفون يبقى ثابتاً أعلى شريط التنقل حتى لا يتداخل مع الآيات",
        "إصلاح تداخل شريط الميكروفون مع الآية الأخيرة في صفحة الاختبار",
        "يختفي شريط التشغيل تلقائياً عند فتح صفحة اختبار التلاوة لتحصل على واجهة أنظف",
      ],
    },
    en: {
      features: [
        "Major Recitation Test redesign: verses are hidden and reveal smoothly as you recite from memory",
        "Hands-free mode: auto-evaluation on silence and automatic advance to the next verse",
      ],
      improvements: [
        "Arabic numerals now appear in their proper Arabic-Indic form (١٢٣) throughout the app when using Arabic",
        "Improved visibility of upcoming verses with clear gray frames in Dark Mode",
        "Fixed missing back buttons on Azkar and Prayer pages for smoother navigation",
      ],
      fixes: [
        "The microphone bar stays fixed above the navigation bar so it never overlaps with the verses",
        "Fixed the microphone bar overlapping the last verse on the recitation test page",
        "The audio player bar now hides automatically when you start the recitation test, giving you a cleaner view",
      ],
    },
  },
  {
    version: "2.8.3",
    date: "2026-03-17",
    ar: {
      fixes: [
        "إصلاح تعليق الصوت في حلقة تحميل لا تنتهي على iPhone",
        "تشغيل الصوت أكثر استقراراً ويتعافى بشكل أفضل من الأخطاء على iPhone",
        "إصلاح مشكلة في الخلفية كانت تتسبب أحياناً في عدم عمل التطبيق بشكل صحيح",
      ],
    },
    en: {
      fixes: [
        "Fixed audio getting stuck in a loading loop on iPhone",
        "Audio playback is now more stable and recovers better from errors on iPhone",
        "Fixed a background issue that was occasionally causing the app to not work correctly",
      ],
    },
  },
  {
    version: "2.8.2",
    date: "2026-03-17",
    ar: {
      improvements: [
        "تحسين الاستجابة على مستويات التكبير المختلفة — النص والأيقونات والأزرار تتكيف تلقائياً",
        "شريط التنقل السفلي يتناسب مع جميع أحجام الشاشات والتكبير — لا تختفي الأيقونات",
        "شريط تشغيل الصوت أصبح أفضل تنسيقاً على جميع أحجام الشاشات",
        "الأزرار تبقى سهلة الضغط حتى عند تكبير الشاشة",
        "السماح بالتكبير حتى ٥ مرات — يمكنك تكبير أي جزء من التطبيق حسب احتياجك",
      ],
    },
    en: {
      improvements: [
        "Improved responsiveness across different zoom levels — text, icons, and buttons scale automatically",
        "Bottom navigation adapts to all screen sizes and zoom levels — icons never disappear",
        "The audio player bar is now better laid out on all screen sizes",
        "Buttons remain easy to tap even when you zoom in on the screen",
        "User zoom now supported up to 5x — you can magnify any part of the app as needed",
      ],
    },
  },
  {
    version: "2.8.1",
    date: "2026-03-17",
    ar: {
      fixes: [
        "إصلاح تسجيل الدخول والتسجيل ليعمل بشكل موثوق في جميع الأحوال",
        "روابط التحقق من البريد الإلكتروني تعمل الآن بشكل صحيح دائماً",
        "رسائل أخطاء أوضح تخبرك بالسبب الفعلي عند حدوث أي مشكلة",
      ],
      improvements: [
        "تسجيل الدخول أكثر استقراراً — جلستك تُؤكَّد بشكل صحيح بعد تسجيل الدخول",
        "تحسين معالجة مشاكل الاتصال أثناء تسجيل الدخول",
      ],
    },
    en: {
      fixes: [
        "Fixed sign-in and sign-up to work reliably in all situations",
        "Email verification links now always work correctly",
        "Clearer error messages that tell you exactly what went wrong when signing in",
      ],
      improvements: [
        "Signing in is now more stable — your session is confirmed properly after logging in",
        "Better handling of connection problems during sign-in",
      ],
    },
  },
  {
    version: "2.8.0",
    date: "2026-03-16",
    ar: {
      improvements: [
        "تحسين دقة التقييم في اختبار التلاوة — تقييم أكثر عدلاً وموثوقية",
        "انتظار الصمت قبل التقييم — يُعطيك وقتاً لإنهاء الآية بشكل طبيعي",
        "إخفاء نص الآية قبل التلاوة — تلقي من الذاكرة بدون مساعدة",
      ],
      fixes: [
        "إصلاح فقدان الكلمات الأخيرة أثناء التلاوة",
        "تحسين استقرار التعرف على الصوت عند انتهاء الجلسة",
      ],
    },
    en: {
      improvements: [
        "Better recitation scoring accuracy — fairer and more reliable evaluation",
        "Wait for silence before scoring — gives you time to finish verses naturally",
        "Verse text is hidden before recitation — truly recite from memory",
      ],
      fixes: [
        "Fixed issue where the last words were sometimes lost during recitation",
        "Improved voice recognition stability when a session ends",
      ],
    },
  },
  {
    version: "2.7.0",
    date: "2026-03-16",
    ar: {
      improvements: [
        "إزالة إشعار تسجيل الدخول المزعج — يمكنك تسجيل الدخول من الإعدادات في أي وقت",
        "إصلاح تسجيل الدخول ليعمل بشكل صحيح في كل مكان",
        "تحسين طريقة تثبيت التطبيق على جهازك وإيصال التحديثات",
      ],
    },
    en: {
      improvements: [
        "Removed the sign-in banner — you can now sign in from Settings whenever you want",
        "Fixed sign-in so it works correctly everywhere",
        "Improved how the app installs on your device and how updates are delivered",
      ],
    },
  },
  {
    version: "2.6.0",
    date: "2026-03-16",
    ar: {
      features: [
        "وضع النوم — استمع للقرآن قبل النوم مع مؤقت ذكي وتلاشٍ تدريجي للصوت",
        "أصوات الطبيعة: مطر وأمواج وغابة تُعزف بجانب القرآن أثناء النوم",
        "واجهة ليلية ساحرة مع قمر متحرك ونجوم تتلألأ وعداد دائري",
        "٣ قراء جدد بأصوات هادئة: سعد الغامدي، ناصر القطامي، خالد القحطاني",
        "بحث في آيات السورة مع تمييز النتائج والتنقل بينها",
        "بوصلة قبلة ثلاثية الأبعاد بتصميم احترافي مع سهم توجيه متحرك",
      ],
      improvements: [
        "حفظ إحصائيات جلسات وضع النوم لمتابعة عاداتك",
      ],
      fixes: [
        "تنظيف قائمة الأذان: الإبقاء على أفضل ٣ أصوات فقط",
        "معاينة الأذان: مؤشر تحميل واضح وتحديد وقت انتهاء مع رسائل خطأ أوضح",
      ],
    },
    en: {
      features: [
        "Sleep Mode — listen to Quran before bed with a smart timer and gradual fade-out",
        "Nature sounds: rain, ocean waves, and forest play alongside the Quran while you sleep",
        "Beautiful night-themed screen with an animated moon, twinkling stars, and circular countdown",
        "3 new calm reciters: Saad Al-Ghamdi, Nasser Al-Qatami, Khalid Al-Qahtani",
        "Search inside any surah with highlighted results and previous/next navigation",
        "Redesigned 3D Qibla compass with a professional look and animated directional arrow",
      ],
      improvements: [
        "Sleep Mode session stats are now saved so you can track your listening habits",
      ],
      fixes: [
        "Adhan list cleaned up — only the top 3 voices kept (Makkah, Madinah, Afasy)",
        "Adhan preview now shows a loading indicator, timeout handling, and clearer errors",
      ],
    },
  },
  {
    version: "2.5.0",
    date: "2026-03-16",
    ar: {
      fixes: [
        "إصلاح تداخل شعارات التثبيت والحفظ في أسفل الشاشة",
        "إصلاح نظام التسجيل والدخول للعمل بدون تأكيد البريد الإلكتروني",
      ],
      improvements: [
        "رسائل أخطاء أوضح عند حدوث أي مشكلة أثناء تسجيل الدخول",
        "بعد إنشاء حسابك، تسجيل دخولك يتم تلقائياً في كل مرة",
        "استقرار وموثوقية أفضل عند إنشاء حسابات جديدة",
      ],
    },
    en: {
      fixes: [
        "Fixed overlapping banners at the bottom of the screen",
        "Fixed sign-up and sign-in to work without email confirmation",
      ],
      improvements: [
        "Clearer error messages when something goes wrong during sign-in",
        "After signing up, you are now logged in automatically every time",
        "More reliable and stable account creation process",
      ],
    },
  },
  {
    version: "2.4.0",
    date: "2026-03-15",
    ar: {
      fixes: [
        "إصلاح حلقة لا نهائية في نظام الإنجازات كانت تُبطئ التطبيق",
        "إصلاح حلقة لا نهائية في تذكير القراءة اليومي كانت تستنزف البطارية",
      ],
      improvements: [
        "استقرار أفضل للتطبيق عند استخدام الإنجازات والتذكيرات معاً",
      ],
    },
    en: {
      fixes: [
        "Fixed an infinite loop in the Achievements system that was slowing the app down",
        "Fixed an infinite loop in the daily reading reminder that was draining battery",
      ],
      improvements: [
        "Much better overall stability when using Achievements and Reminders",
      ],
    },
  },
  {
    version: "2.3.0",
    date: "2026-03-14",
    ar: {
      features: [
        "تبويب «ترجمة» مستقل في صفحة قراءة السورة",
        "دعم أكثر من ١٢ ترجمة: Sahih International، يوسف علي، بكثال، وأخرى",
      ],
      fixes: [
        "إصلاح تجاوز الحد في صفحة التسبيح على الشاشات الصغيرة",
        "إصلاح اقتطاع النص في بطاقة متابعة القراءة وشريط تشغيل السورة",
        "إصلاح عرض إحصائيات الحفظ على شاشات الهواتف الصغيرة",
      ],
      improvements: [
        "جميع الأزرار في التطبيق أصبحت أسهل للضغط بدقة",
      ],
    },
    en: {
      features: [
        "Dedicated Translation tab in the Surah reader",
        "Support for 12+ translations: Sahih International, Yusuf Ali, Pickthall, and more",
      ],
      fixes: [
        "Fixed Tasbeeh page overflowing on small screens",
        "Fixed text truncation in the Continue Reading card and Surah bottom bar",
        "Fixed the memorization statistics display on small phone screens",
      ],
      improvements: [
        "All buttons across the app are now easier to tap accurately",
      ],
    },
  },
  {
    version: "2.2.0",
    date: "2026-03-12",
    ar: {
      fixes: [
        "إصلاح ظهور زر الإغلاق مكرراً في شاشة التشغيل والإنجازات وسجل التحديثات",
        "إضافة زر إغلاق دائم في وضع التركيز حتى لا يختفي عن المستخدم",
      ],
      improvements: [
        "شاشة التشغيل الكاملة تظهر الآن بحركة انتقال سلسة من الأسفل",
        "زر إغلاق رسالة التثبيت أكبر وأسهل للضغط",
      ],
    },
    en: {
      fixes: [
        "Fixed a duplicate close button appearing in Now Playing, Achievements, and Changelog",
        "Added a persistent close button in Focus Mode so it never hides from the user",
      ],
      improvements: [
        "The Now Playing full screen now slides up with a smooth, natural animation",
        "Install banner close button is larger and much easier to tap",
      ],
    },
  },
  {
    version: "2.1.0",
    date: "2026-03-12",
    ar: {
      improvements: [
        "طلب إذن الموقع فقط عند استخدام أداة القبلة، لا عند فتح التطبيق",
        "رسالة واضحة عند التحقق من التحديثات",
        "أيقونات وخطوط أكبر في شريط التنقل السفلي",
      ],
    },
    en: {
      improvements: [
        "Location permission is only requested when you open the Qibla tool",
        "Clear message shown when checking for updates",
        "Larger, more readable icons and labels in the bottom navigation bar",
      ],
    },
  },
  {
    version: "2.0.0",
    date: "2026-03-12",
    ar: {
      features: [
        "شاشة تشغيل كاملة مع اسم السورة والقارئ وأزرار تحكم",
        "عرض الآيات أثناء التلاوة مع تمييز الآية الحالية",
      ],
      improvements: [
        "تحميل التلاوات أكثر موثوقية مع تأكيد قبل إظهار رسالة النجاح",
        "زر للتحقق من التلاوات المحمّلة وإصلاح الملفات غير المكتملة",
        "تحسين تثبيت التطبيق على أجهزة أندرويد",
      ],
    },
    en: {
      features: [
        "New Now Playing screen with surah name, reciter info, and playback controls",
        "Verse-by-verse display during recitation with the current verse highlighted",
      ],
      improvements: [
        "Audio downloads are more reliable — success is confirmed before notifying you",
        "New button to verify downloaded recitations and repair incomplete files",
        "Better app installation experience on Android devices",
      ],
    },
  },
  {
    version: "1.5.0",
    date: "2026-03-10",
    ar: {
      features: [
        "نظام تحديث تلقائي ذكي للتطبيق",
        "زر مشاركة التطبيق مع الأصدقاء",
        "عرض رقم الإصدار وسجل التحديثات",
      ],
      improvements: [
        "التحقق اليدوي من التحديثات في أي وقت",
      ],
    },
    en: {
      features: [
        "Smart automatic app update system",
        "Share the app with friends directly from Settings",
        "Version number display and full changelog viewer",
      ],
      improvements: [
        "Manual update check available anytime in Settings",
      ],
    },
  },
  {
    version: "1.0.0",
    date: "2026-03-01",
    ar: {
      features: [
        "الإصدار الأول — القرآن الكريم مع البحث والعلامات المرجعية",
        "الأذكار والأدعية مع عدّاد التكرار",
        "مواقيت الصلاة واتجاه القبلة",
        "الوضع الليلي والتحكم بحجم الخط",
        "تحميل القرآن والتلاوات للاستخدام بدون إنترنت",
      ],
    },
    en: {
      features: [
        "First release — Quran reading with search and bookmarks",
        "Azkar and Duas with repetition counter",
        "Prayer times and Qibla direction",
        "Dark mode and font size controls",
        "Offline Quran text and audio downloads",
      ],
    },
  },
];
