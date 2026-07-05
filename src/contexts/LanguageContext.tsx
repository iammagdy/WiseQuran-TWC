import { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type AppLanguage = "ar" | "en";

interface Translations {
  // Navigation
  nav_quran: string;
  nav_azkar: string;
  nav_prayer: string;
  nav_tasbeeh: string;
  nav_settings: string;
  nav_ramadan: string;

  // Common
  back: string;
  close: string;
  retry: string;
  loading: string;
  search: string;
  save: string;
  reset: string;
  cancel: string;
  confirm: string;
  copied: string;
  share: string;
  today: string;
  ayah: string;
  ayahs: string;
  surah: string;
  page: string;
  minutes_abbr: string;
  ok: string;
  hour: string;
  minute: string;
  second: string;
  days: string;
  day: string;
  overdue: string;
  km: string;
  meters: string;

  // QuranPage
  quran_title: string;
  continue_reading: string;
  search_placeholder: string;
  daily_goal: string;
  surah_list: string;
  juz_list: string;
  bookmarks: string;
  favorites: string;
  history: string;
  reading_history: string;
  statistics: string;
  memorization: string;
  revelation_meccan: string;
  revelation_medinan: string;
  no_bookmarks: string;
  no_favorites: string;
  no_history: string;
  goal_complete: string;

  // SurahReaderPage tabs (aliased for both naming patterns)
  tab_text: string;
  text_tab: string;
  tab_translation: string;
  translation_tab: string;
  tab_tafsir: string;
  tafsir_tab: string;
  focus_mode: string;
  mushaf_view: string;
  ayah_view: string;
  tafsir_of_ayah: string;
  show_full_tafsir: string;
  search_tafsir: string;
  no_tafsir_results: string;
  no_tafsir: string;
  no_translation: string;
  jump_to_ayah: string;
  go_to_page: string;
  go: string;
  page_out_of_range: string;
  invalid_page: string;
  loading_surah: string;
  surah_load_error: string;
  error_loading: string;
  bismillah: string;

  // Translation tab
  translation_header: string;

  // Audio
  now_playing: string;
  playing: string;
  reciter: string;
  of: string;
  download: string;
  downloaded: string;
  audio_unavailable_offline: string;
  audio_disclaimer: string;

  // Azkar
  azkar_title: string;
  azkar_subtitle: string;
  morning_azkar: string;
  evening_azkar: string;
  sleep_azkar: string;
  prayer_azkar: string;
  all_categories: string;
  favorites_only: string;
  azkar_done: string;
  azkar_reset: string;
  times: string;
  no_favorites_azkar: string;
  azkar_search: string;
  azkar_no_results: string;

  // Prayer
  prayer_title: string;
  prayers_title: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  next_prayer: string;
  location_required: string;
  qibla: string;
  prayer_guide: string;
  prayers_completed: string;
  prayer_countdown: string;
  location_detecting: string;
  location_error: string;
  qibla_banner: string;
  qibla_subtitle: string;
  days_streak: string;
  prayers_complete: string;
  complete_prayers: string;

  // Tasbeeh
  tasbeeh_title: string;
  set_target: string;
  target: string;
  total_today: string;
  today_total: string;
  counter_complete: string;
  mashaallah: string;

  // Hifz
  hifz_title: string;
  hifz_subtitle: string;
  memorized: string;
  in_progress: string;
  not_started: string;
  todays_review: string;
  today_review: string;
  no_reviews_today: string;
  review_done_all: string;
  all_reviews_done: string;
  start_hifz: string;
  add_memorized_hint: string;
  mastered: string;
  needs_review: string;
  overdue_days: string;
  strength: string;
  in_review: string;
  due_today: string;
  total_reviews: string;
  avg_streak: string;
  next_review: string;
  mark_memorized: string;
  mark_in_progress: string;
  mark_not_started: string;
  all_surahs: string;
  memorized_surahs: string;
  in_progress_surahs: string;
  filter_all: string;
  no_surahs_in_filter: string;
  weak: string;
  medium: string;
  strong: string;

  // Stats
  stats_title: string;
  total_ayahs: string;
  reading_minutes: string;
  streak_days: string;
  longest_streak: string;
  this_week: string;
  this_month: string;
  weekly_reading: string;
  monthly_calendar: string;
  achievements: string;
  goal_today: string;
  today_goal: string;

  // Settings
  settings_title: string;
  settings_subtitle: string;
  appearance: string;
  theme_light: string;
  theme_dark: string;
  theme_dark_mode: string;
  font_size: string;
  quran_font_size: string;
  ui_scale: string;
  scale_normal: string;
  scale_large: string;
  scale_xlarge: string;
  reciter_section: string;
  tafsir_section: string;
  translation_section: string;
  show_translation: string;
  show_translation_subtitle: string;
  prayer_notifications: string;
  prayer_time_reminder: string;
  prayer_time_reminder_enabled: string;
  prayer_time_reminder_disabled: string;
  prayer_time_hint: string;
  prayer_notifications_denied: string;
  notifications_not_supported: string;
  notifications_permission_denied: string;
  azkar_reminder: string;
  azkar_reminder_enabled: string;
  azkar_reminder_disabled: string;
  azkar_reminder_hint: string;
  reading_reminder: string;
  reading_reminder_enabled: string;
  reading_reminder_disabled: string;
  reading_reminder_hint: string;
  reading_reminder_time: string;
  prayer_method: string;
  daily_reading_goal: string;
  daily_verse_count: string;
  downloads: string;
  downloads_quran_text: string;
  downloads_quran_desc: string;
  downloads_audio: string;
  downloads_audio_desc: string;
  downloads_clear_all: string;
  downloads_download_all: string;
  downloads_complete: string;
  downloads_downloading: string;
  downloads_downloading_audio: string;
  downloads_verifying: string;
  downloads_clear_audio: string;
  downloads_verify: string;
  downloads_show_details: string;
  downloads_hide_details: string;
  downloads_confirm_clear_audio_title: string;
  downloads_confirm_clear_audio_desc: string;
  downloads_confirm_yes: string;
  install_app: string;
  install_app_ios_intro: string;
  install_app_intro: string;
  install_app_already: string;
  storage: string;
  storage_total: string;
  storage_quran_text: string;
  storage_surahs_count: string;
  storage_audio: string;
  storage_audio_count: string;
  storage_tafsir: string;
  storage_tafsir_count: string;
  storage_empty: string;
  storage_confirm_clear_tafsir_title: string;
  storage_confirm_clear_tafsir_desc: string;
  reset_progress: string;
  reset_progress_desc: string;
  reset_progress_confirm_title: string;
  reset_progress_confirm_desc: string;
  reset_progress_confirm_btn: string;
  reset_progress_success: string;
  ramadan_tab: string;
  ramadan_show_tab: string;
  ramadan_show_tab_desc: string;
  ramadan_tab_shown: string;
  ramadan_tab_hidden: string;
  about: string;
  about_description: string;
  version: string;
  changelog: string;
  share_app: string;
  share_app_text: string;
  check_updates: string;
  up_to_date: string;
  up_to_date_desc: string;
  language: string;
  language_arabic: string;
  language_english: string;
  audio_preview: string;

  // Qibla
  qibla_title: string;
  qibla_description: string;
  qibla_direction: string;
  qibla_aligned: string;
  qibla_rotate: string;
  distance_to_kaaba: string;
  compass_accuracy: string;
  accuracy_high: string;
  accuracy_medium: string;
  accuracy_low: string;
  lock_compass: string;
  compass_locked: string;
  unlock_compass: string;
  calibrate: string;
  location_permission: string;
  compass_not_supported: string;
  km_away: string;
  your_location: string;
  location_accuracy: string;
  facing_qibla: string;
  move_device: string;
  calibration_title: string;
  calibration_desc: string;
  allow_compass: string;
  sensor_error: string;

  // Ramadan
  ramadan_title: string;
  ramadan_day: string;
  ramadan_of: string;
  iftar_countdown: string;
  suhoor_countdown: string;
  daily_dua: string;
  ramadan_tips: string;
  daily_checklist: string;
  khatmah_plan: string;
  juz_parts: string;
  today_juz: string;
  complete: string;
  done: string;
  activities_title: string;
  ramadan_error_msg: string;
  error_title: string;
  error_retry: string;

  // Daily Ayah / Wird
  daily_ayah: string;
  daily_wird: string;
  start_khatm_plan: string;
  percent_of_khatm: string;
  restart: string;
  days_plan: string;

  // Reading timer
  reading_time_up: string;

  // Focus mode
  close_focus: string;

  // Achievements
  achievements_title: string;
  achievements_subtitle: string;
  unlocked: string;
  locked: string;
  overall_progress: string;
  new_achievement: string;
  achievement_streak: string;
  achievement_reading: string;
  achievement_hifz: string;
  achievement_goals: string;

  // Changelog
  whats_new: string;
  update_notes: string;
  app_updated: string;
  app_updated_title: string;
  show_all_changelog: string;
  ok_thanks: string;
  whats_new_button: string;
  update_auto_dismiss: string;
  tafsir_english_note: string;

  // Install banner
  install_title: string;
  install_description: string;
  install_button: string;
  install_dismiss: string;
  install_subtitle: string;
  install: string;

  // Update notification
  update_available: string;
  update_description: string;
  update_now: string;
  updating: string;
  update: string;

  // Not found
  not_found: string;
  go_home: string;

  // Recitation Test
  recitation_test: string;
  recitation_subtitle: string;
  select_surah: string;
  select_range: string;
  verse_from: string;
  verse_to: string;
  start_test: string;
  tap_to_speak: string;
  listening: string;
  stop_listening: string;
  processing: string;
  test_result: string;
  your_score: string;
  correct_ayahs: string;
  out_of: string;
  try_again: string;
  excellent: string;
  good_job: string;
  keep_practicing: string;
  speech_not_supported: string;
  speech_not_supported_desc: string;
  no_speech_detected: string;
  recitation_history: string;
  best_score: string;
  per_ayah_breakdown: string;
  correct: string;
  incorrect: string;
  verses: string;
  strictness: string;
  strictness_lenient: string;
  strictness_normal: string;
  strictness_strict: string;
  islamic_feedback_excellent: string;
  islamic_feedback_good: string;
  islamic_feedback_weak: string;
  my_progress: string;
  accuracy_over_time: string;
  no_progress_data: string;
  partial: string;

  // Listening Tab
  listening_tab: string;
  playback_speed: string;
  verse_repeat: string;
  repeat_off: string;
  repeat_times: string;
  now_playing_verse: string;
  speed_label: string;
  reciter_label: string;
  listening_hint: string;

  // HifzPage extras
  hifz_streak: string;
  hifz_streak_days: string;
  daily_hifz_goal: string;
  goal_surahs_per_day: string;
  goal_ayahs_per_day: string;
  set_goal: string;
  todays_goal_progress: string;
  hifz_goal_done: string;
  reading_progress: string;

  // QuranPage mode cards
  mode_reading: string;
  mode_reading_subtitle: string;
  mode_listening: string;
  mode_listening_subtitle: string;
  mode_hifz: string;
  mode_hifz_subtitle: string;
  mode_recitation: string;
  mode_recitation_subtitle: string;

  // Mode labels (used in SurahReaderPage header pill)
  listening_mode_label: string;
  reading_mode_label: string;

  // Iftar Countdown
  iftar_time: string;
  iftar_dua_text: string;
  time_until_iftar: string;
  calculating_time: string;

  // Daily Dua Card
  daily_dua_label: string;
  dua_copied: string;
  copy_failed: string;

  // Prayer Guide
  prayer_guide_title: string;
  wudu_guide: string;
  prayer_steps_guide: string;
  rakat_count_label: string;
  recitation_guide: string;
  recitation_guide_desc: string;
  prayer_source: string;
  mode_loud: string;
  mode_silent: string;

  // HifzPage toast messages
  hifz_toast_well_done: string;
  hifz_toast_reviewed_surah: string;
  hifz_toast_keep_going: string;
  hifz_toast_will_appear: string;
  hifz_recitation_test_btn: string;
  hifz_recitation_test_desc: string;
  hifz_review_count: string;
  hifz_review_card_subtitle: string;
  hifz_review_card_title_singular: string;
  hifz_review_card_title_plural: string;
  hifz_open_surah_read: string;
  hifz_open_surah_listen: string;
  hifz_did_you_review: string;
  hifz_action_start_reading: string;
  hifz_action_start_listening: string;
  hifz_action_continue_reading: string;
  hifz_action_listen: string;
  hifz_action_read_to_review: string;
  hifz_action_listen_to_review: string;
  hifz_action_mark_in_progress: string;
  hifz_action_mark_memorized: string;
  hifz_action_mark_not_started: string;
  hifz_welcome_title: string;
  hifz_welcome_subtitle: string;
  hifz_start_with_fatiha: string;

  // Settings toast messages
  settings_toast_preview_timeout: string;
  settings_toast_preview_error: string;
  settings_toast_download_failed: string;
  settings_toast_quran_downloaded: string;
  settings_toast_data_cleared: string;
  settings_toast_audio_downloaded: string;
  settings_toast_audio_cleared: string;
  settings_toast_tafsir_cleared: string;
  settings_toast_verify_failed: string;
  settings_toast_recitation_downloaded: string;
  settings_toast_recitation_failed: string;

  // DailyAyah toast
  could_not_play_audio: string;
}

const ar: Translations = {
  nav_quran: "القرآن",
  nav_azkar: "الأذكار",
  nav_prayer: "الصلوات",
  nav_tasbeeh: "التسبيح",
  nav_settings: "الإعدادات",
  nav_ramadan: "رمضان",

  back: "رجوع",
  close: "إغلاق",
  retry: "إعادة المحاولة",
  loading: "جارٍ التحميل...",
  search: "بحث",
  save: "حفظ",
  reset: "إعادة تعيين",
  cancel: "إلغاء",
  confirm: "تأكيد",
  copied: "تم النسخ",
  share: "مشاركة",
  today: "اليوم",
  ayah: "آية",
  ayahs: "آية",
  surah: "سورة",
  page: "صفحة",
  minutes_abbr: "د",
  ok: "حسناً",
  hour: "ساعة",
  minute: "دقيقة",
  second: "ثانية",
  days: "أيام",
  day: "اليوم",
  overdue: "متأخرة",
  km: "كم",
  meters: "متر",

  quran_title: "القرآن الكريم",
  continue_reading: "متابعة القراءة",
  search_placeholder: "بحث بالاسم، الرقم، أو نص الآية...",
  daily_goal: "هدف اليوم",
  surah_list: "السور",
  juz_list: "الأجزاء",
  bookmarks: "العلامات",
  favorites: "المفضلة",
  history: "السجل",
  reading_history: "سجل القراءة",
  statistics: "الإحصائيات",
  memorization: "الحفظ",
  revelation_meccan: "مكية",
  revelation_medinan: "مدنية",
  no_bookmarks: "لا توجد علامات مرجعية",
  no_favorites: "لا توجد سور مفضلة",
  no_history: "لا يوجد سجل قراءة",
  goal_complete: "ما شاء الله! أكملت هدفك اليوم",

  tab_text: "النص",
  text_tab: "النص",
  tab_translation: "ترجمة",
  translation_tab: "ترجمة",
  tab_tafsir: "التفسير",
  tafsir_tab: "التفسير",
  focus_mode: "وضع التركيز",
  mushaf_view: "عرض المصحف",
  ayah_view: "عرض الآيات",
  tafsir_of_ayah: "تفسير الآية",
  show_full_tafsir: "← عرض تفسير السورة بالكامل",
  search_tafsir: "ابحث في التفسير...",
  no_tafsir_results: "لا توجد نتائج لـ",
  no_tafsir: "لا يوجد تفسير متاح",
  no_translation: "لا توجد ترجمة متاحة",
  jump_to_ayah: "انتقل إلى آية...",
  go_to_page: "انتقل إلى صفحة",
  go: "انتقل",
  page_out_of_range: "صفحة خارج نطاق السورة",
  invalid_page: "رقم صفحة غير صالح",
  loading_surah: "جارٍ تحميل السورة...",
  surah_load_error: "تعذر تحميل السورة. تحقق من الاتصال بالإنترنت.",
  error_loading: "تعذر التحميل",
  bismillah: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",

  translation_header: "ترجمة معاني القرآن",

  now_playing: "تلاوة جارية",
  playing: "تلاوة جارية",
  reciter: "القارئ",
  of: "من",
  download: "تحميل",
  downloaded: "محمّل",
  audio_unavailable_offline: "صوت غير متاح بدون إنترنت — حمّل الصوت أولاً",
  audio_disclaimer: "قد يتوقف الصوت تلقائياً حسب إعدادات الجهاز والمتصفح",

  azkar_title: "الأذكار والأدعية",
  azkar_subtitle: "أذكار يومية",
  morning_azkar: "أذكار الصباح",
  evening_azkar: "أذكار المساء",
  sleep_azkar: "أذكار النوم",
  prayer_azkar: "أذكار الصلاة",
  all_categories: "الكل",
  favorites_only: "المفضلة",
  azkar_done: "أحسنت! أكملت هذا الذكر",
  azkar_reset: "إعادة",
  times: "مرة",
  no_favorites_azkar: "لا توجد أذكار مفضلة بعد",
  azkar_search: "بحث في الأذكار",
  azkar_no_results: "لا توجد نتائج",

  prayer_title: "مواقيت الصلاة",
  prayers_title: "صلواتي اليوم",
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
  next_prayer: "الصلاة القادمة",
  location_required: "يتطلب تحديد الموقع",
  qibla: "القبلة",
  prayer_guide: "دليل الصلاة",
  prayers_completed: "صلوات مكتملة",
  prayer_countdown: "الوقت المتبقي",
  location_detecting: "جارٍ تحديد الموقع...",
  location_error: "تعذر تحديد الموقع",
  qibla_banner: "اتجاه القبلة 🕋",
  qibla_subtitle: "حدد اتجاه الكعبة المشرفة",
  days_streak: "أيام",
  prayers_complete: "ما شاء الله! 🎉",
  complete_prayers: "أكمل صلواتك",

  tasbeeh_title: "التسبيح",
  set_target: "تحديد العدد المستهدف",
  target: "الهدف",
  total_today: "إجمالي اليوم",
  today_total: "إجمالي اليوم",
  counter_complete: "ما شاء الله!",
  mashaallah: "ما شاء الله! 🎉",

  hifz_title: "متابعة الحفظ",
  hifz_subtitle: "تتبع حفظك للقرآن الكريم",
  memorized: "محفوظة",
  in_progress: "قيد الحفظ",
  not_started: "لم تبدأ",
  todays_review: "المراجعة اليوم",
  today_review: "المراجعة اليوم",
  no_reviews_today: "لا توجد مراجعات اليوم",
  review_done_all: "أحسنت! أكملت جميع المراجعات",
  all_reviews_done: "أحسنت! أكملت جميع المراجعات 🎉",
  start_hifz: "ضع سوراً كمحفوظة لبدء المراجعة",
  add_memorized_hint: "ضع سوراً كمحفوظة لبدء المراجعة",
  mastered: "أتقنتها",
  needs_review: "تحتاج مراجعة",
  overdue_days: "متأخرة",
  strength: "القوة",
  in_review: "في المراجعة",
  due_today: "مستحقة اليوم",
  total_reviews: "إجمالي المراجعات",
  avg_streak: "متوسط السلسلة",
  next_review: "المراجعة القادمة",
  mark_memorized: "محفوظة",
  mark_in_progress: "قيد الحفظ",
  mark_not_started: "لم تبدأ",
  all_surahs: "كل السور",
  memorized_surahs: "المحفوظة",
  in_progress_surahs: "قيد الحفظ",
  filter_all: "الكل",
  no_surahs_in_filter: "لا توجد سور في هذا التصنيف",
  weak: "ضعيف",
  medium: "متوسط",
  strong: "قوي",

  stats_title: "الإحصائيات",
  total_ayahs: "إجمالي الآيات",
  reading_minutes: "دقائق القراءة",
  streak_days: "أيام متواصلة",
  longest_streak: "أطول سلسلة",
  this_week: "هذا الأسبوع",
  this_month: "هذا الشهر",
  weekly_reading: "القراءة الأسبوعية",
  monthly_calendar: "التقويم الشهري",
  achievements: "الإنجازات",
  goal_today: "هدف اليوم",
  today_goal: "هدف اليوم",

  settings_title: "الإعدادات",
  settings_subtitle: "إعدادات التطبيق",
  appearance: "المظهر والقراءة",
  theme_light: "فاتح",
  theme_dark: "داكن",
  theme_dark_mode: "الوضع الليلي",
  font_size: "حجم الخط",
  quran_font_size: "حجم خط القرآن",
  ui_scale: "حجم الواجهة",
  scale_normal: "عادي",
  scale_large: "كبير",
  scale_xlarge: "أكبر",
  reciter_section: "القارئ",
  tafsir_section: "التفسير",
  translation_section: "الترجمة · Translation",
  show_translation: "إظهار الترجمة",
  show_translation_subtitle: "Show Quran translation",
  prayer_notifications: "إشعارات الصلاة",
  prayer_time_reminder: "تذكير بأوقات الصلاة",
  prayer_time_reminder_enabled: "تم تفعيل إشعارات الصلاة",
  prayer_time_reminder_disabled: "تم إيقاف إشعارات الصلاة",
  prayer_time_hint: "ستصلك إشعارات عند دخول وقت كل صلاة",
  prayer_notifications_denied: "تم رفض إذن الإشعارات — يرجى تفعيلها من إعدادات المتصفح",
  notifications_not_supported: "المتصفح لا يدعم الإشعارات",
  notifications_permission_denied: "تم رفض إذن الإشعارات، يرجى تفعيلها من إعدادات المتصفح",
  azkar_reminder: "تذكير بأذكار الصباح والمساء",
  azkar_reminder_enabled: "تم تفعيل تذكير الأذكار",
  azkar_reminder_disabled: "تم إيقاف تذكير الأذكار",
  azkar_reminder_hint: "تذكير عند الفجر والمغرب لقراءة الأذكار",
  reading_reminder: "تذكير القراءة اليومية",
  reading_reminder_enabled: "تم تفعيل تذكير القراءة اليومية",
  reading_reminder_disabled: "تم إيقاف تذكير القراءة اليومية",
  reading_reminder_hint: "تذكير يومي لقراءة وردك من القرآن الكريم",
  reading_reminder_time: "وقت التذكير",
  prayer_method: "طريقة حساب أوقات الصلاة",
  daily_reading_goal: "هدف القراءة اليومي",
  daily_verse_count: "عدد الآيات يومياً",
  downloads: "التنزيلات",
  downloads_quran_text: "نصوص القرآن",
  downloads_quran_desc: "تحميل نصوص السور للقراءة بدون إنترنت",
  downloads_audio: "التلاوات الصوتية",
  downloads_audio_desc: "تحميل التلاوات للاستماع بدون إنترنت",
  downloads_clear_all: "مسح الكل",
  downloads_download_all: "تحميل الكل",
  downloads_complete: "مكتمل",
  downloads_downloading: "جارٍ التحميل...",
  downloads_downloading_audio: "جارٍ تحميل التلاوات...",
  downloads_verifying: "جارٍ التحقق...",
  downloads_clear_audio: "مسح الصوت",
  downloads_verify: "التحقق من التحميلات",
  downloads_show_details: "عرض التفاصيل",
  downloads_hide_details: "إخفاء التفاصيل",
  downloads_confirm_clear_audio_title: "مسح جميع التلاوات؟",
  downloads_confirm_clear_audio_desc: "سيتم حذف جميع ملفات الصوت المحملة. يمكنك إعادة تحميلها لاحقاً.",
  downloads_confirm_yes: "نعم، مسح الكل",
  install_app: "تثبيت التطبيق",
  install_app_ios_intro: "لتثبيت التطبيق على جهازك:",
  install_app_intro: "لتثبيت التطبيق على جهازك:",
  install_app_already: "التطبيق مثبّت بالفعل",
  storage: "مساحة التخزين",
  storage_total: "إجمالي التخزين",
  storage_quran_text: "نصوص القرآن",
  storage_surahs_count: "سورة",
  storage_audio: "التلاوات الصوتية",
  storage_audio_count: "ملف صوتي",
  storage_tafsir: "التفاسير",
  storage_tafsir_count: "سورة",
  storage_empty: "لا توجد بيانات محملة حالياً",
  storage_confirm_clear_tafsir_title: "مسح جميع التفاسير؟",
  storage_confirm_clear_tafsir_desc: "سيتم حذف جميع التفاسير المحملة. يمكنك إعادة تحميلها لاحقاً.",
  reset_progress: "إعادة تعيين التقدم",
  reset_progress_desc: "سيتم مسح سجل القراءة والعلامات المرجعية والمفضلة والأهداف اليومية. لن يتم حذف البيانات المحملة.",
  reset_progress_confirm_title: "إعادة تعيين جميع التقدم؟",
  reset_progress_confirm_desc: "سيتم مسح: آخر قراءة، العلامات المرجعية، السور المفضلة، الهدف اليومي، سجل القراءة، وسلسلة الأيام. هل أنت متأكد؟",
  reset_progress_confirm_btn: "نعم، إعادة تعيين",
  reset_progress_success: "تم إعادة تعيين التقدم بنجاح",
  ramadan_tab: "تبويب رمضان",
  ramadan_show_tab: "إظهار تبويب رمضان",
  ramadan_show_tab_desc: "يظهر التبويب تلقائياً خلال شهر رمضان فقط",
  ramadan_tab_shown: "تم إظهار تبويب رمضان",
  ramadan_tab_hidden: "تم إخفاء تبويب رمضان",
  about: "عن التطبيق",
  about_description: "تطبيق للقراءة والأذكار والصلاة",
  version: "الإصدار",
  changelog: "سجل التحديثات",
  share_app: "مشاركة التطبيق",
  share_app_text: "تطبيق القرآن الكريم والأذكار — حمّله الآن!",
  check_updates: "التحقق من التحديثات",
  up_to_date: "أنت تستخدم أحدث نسخة",
  up_to_date_desc: "التطبيق محدث بالكامل",
  language: "اللغة",
  language_arabic: "العربية",
  language_english: "English",
  audio_preview: "معاينة الصوت",

  qibla_title: "اتجاه القبلة",
  qibla_description: "البوصلة نحو الكعبة المشرفة",
  qibla_direction: "اتجاه القبلة",
  qibla_aligned: "في اتجاه القبلة",
  qibla_rotate: "دوّر الجهاز",
  distance_to_kaaba: "المسافة إلى الكعبة",
  compass_accuracy: "دقة البوصلة:",
  accuracy_high: "عالية",
  accuracy_medium: "متوسطة",
  accuracy_low: "منخفضة",
  lock_compass: "تثبيت البوصلة",
  compass_locked: "البوصلة مثبتة",
  unlock_compass: "إلغاء التثبيت",
  calibrate: "معايرة",
  location_permission: "يتطلب إذن الموقع",
  compass_not_supported: "البوصلة غير مدعومة في هذا الجهاز",
  km_away: "كم",
  your_location: "موقعك",
  location_accuracy: "دقة الموقع:",
  facing_qibla: "✓ أنت تواجه القبلة الآن",
  move_device: "حرّك جهازك لتفعيل البوصلة",
  calibration_title: "معايرة البوصلة",
  calibration_desc: "لتحسين دقة البوصلة، حرّك جهازك على شكل رقم ٨ عدة مرات حتى تتحسن الدقة.",
  allow_compass: "يرجى السماح بالوصول إلى البوصلة",
  sensor_error: "تعذر الوصول إلى مستشعر الاتجاه",

  ramadan_title: "رمضان كريم 🌙",
  ramadan_day: "اليوم",
  ramadan_of: "من رمضان",
  iftar_countdown: "الوقت المتبقي للإفطار",
  suhoor_countdown: "الوقت المتبقي للسحور",
  daily_dua: "دعاء اليوم",
  ramadan_tips: "نصائح رمضانية",
  daily_checklist: "ورد اليوم ✅",
  khatmah_plan: "ختمة رمضان 📖",
  juz_parts: "جزء",
  today_juz: "جزء اليوم",
  complete: "إتمام ✓",
  done: "تم",
  activities_title: "فضائل وأدعية 🤲",
  ramadan_error_msg: "لم نتمكن من تحميل بيانات رمضان. يرجى المحاولة مرة أخرى.",
  error_title: "عذراً، حدث خطأ",
  error_retry: "إعادة المحاولة",

  daily_ayah: "آية اليوم",
  daily_wird: "الورد اليومي",
  start_khatm_plan: "ابدأ خطة ختمة",
  percent_of_khatm: "% من الختمة",
  restart: "إعادة البدء",
  days_plan: "يوم",

  reading_time_up: "انتهى وقت القراءة 📖",

  close_focus: "إغلاق وضع التركيز",

  achievements_title: "الإنجازات",
  achievements_subtitle: "تتبع إنجازاتك في القراءة",
  unlocked: "مفتوح",
  locked: "مقفل",
  overall_progress: "التقدم الكلي",
  new_achievement: "🎉 إنجاز جديد!",
  achievement_streak: "المواصلة",
  achievement_reading: "القراءة",
  achievement_hifz: "الحفظ",
  achievement_goals: "الأهداف",

  whats_new: "ما الجديد في الإصدار",
  update_notes: "ملاحظات التحديث",
  app_updated: "تم تحديث التطبيق بنجاح",
  app_updated_title: "تم التحديث ✓",
  show_all_changelog: "عرض كل سجل التحديثات",
  ok_thanks: "حسناً، شكراً!",
  whats_new_button: "ما الجديد؟",
  update_auto_dismiss: "سيُغلق تلقائياً خلال...",
  tafsir_english_note: "عرض التفسير بالإنجليزية",

  install_title: "ثبّت التطبيق",
  install_description: "أضف التطبيق إلى شاشتك الرئيسية للوصول السريع",
  install_button: "تثبيت",
  install_dismiss: "لاحقاً",
  install_subtitle: "للوصول السريع بدون متصفح",
  install: "تثبيت",

  update_available: "تحديث جديد متاح",
  update_description: "اضغط للتحديث والحصول على أحدث الميزات",
  update_now: "تحديث الآن",
  updating: "جارٍ التحديث...",
  update: "تحديث",

  not_found: "الصفحة غير موجودة",
  go_home: "العودة للرئيسية",

  recitation_test: "اختبار التلاوة",
  recitation_subtitle: "اختبر حفظك بالتلاوة الصوتية",
  select_surah: "اختر السورة",
  select_range: "نطاق الآيات",
  verse_from: "من آية",
  verse_to: "إلى آية",
  start_test: "ابدأ الاختبار",
  tap_to_speak: "اضغط للتلاوة",
  listening: "جارٍ الاستماع...",
  stop_listening: "إيقاف",
  processing: "جارٍ تحليل الصوت...",
  test_result: "نتيجة الاختبار",
  your_score: "نتيجتك",
  correct_ayahs: "آيات صحيحة",
  out_of: "من",
  try_again: "حاول مجدداً",
  excellent: "ممتاز! أحسنت",
  good_job: "جيد! استمر في التدريب",
  keep_practicing: "تحتاج إلى مزيد من المراجعة",
  speech_not_supported: "المايكروفون غير متاح",
  speech_not_supported_desc: "يتطلب الاختبار الوصول إلى المايكروفون. يُرجى السماح بالوصول من إعدادات المتصفح.",
  no_speech_detected: "لم يُكتشف كلام. حاول مجدداً.",
  recitation_history: "سجل الاختبارات",
  best_score: "أفضل نتيجة",
  per_ayah_breakdown: "تفصيل الآيات",
  correct: "صحيح",
  incorrect: "خطأ",
  verses: "آيات",
  strictness: "مستوى الدقة",
  strictness_lenient: "متساهل",
  strictness_normal: "عادي",
  strictness_strict: "صارم",
  islamic_feedback_excellent: "ما شاء الله! بارك الله فيك",
  islamic_feedback_good: "أحسنت! واصل التدريب",
  islamic_feedback_weak: "جزاك الله خيراً، تحتاج لمزيد من المراجعة",
  my_progress: "تقدمي",
  accuracy_over_time: "دقة التلاوة عبر الوقت",
  no_progress_data: "لا يوجد سجل بعد. ابدأ الاختبار لتتبع تقدمك.",
  partial: "جزئي",
  listening_tab: "الاستماع",
  playback_speed: "سرعة التشغيل",
  verse_repeat: "تكرار الآية",
  repeat_off: "إيقاف",
  repeat_times: "مرات",
  now_playing_verse: "آية تعزف الآن",
  speed_label: "السرعة",
  reciter_label: "القارئ",
  listening_hint: "استمع للقرآن مع عرض الآيات",
  hifz_streak: "سلسلة الحفظ",
  hifz_streak_days: "يوم متواصل",
  daily_hifz_goal: "هدف الحفظ اليومي",
  goal_surahs_per_day: "سور في اليوم",
  goal_ayahs_per_day: "آيات في اليوم",
  set_goal: "تحديد الهدف",
  todays_goal_progress: "تقدم هدف اليوم",
  hifz_goal_done: "ما شاء الله! أكملت هدف اليوم",
  reading_progress: "تقدم القراءة",

  mode_reading: "القراءة",
  mode_reading_subtitle: "تصفح وقرأ القرآن الكريم",
  mode_listening: "الاستماع",
  mode_listening_subtitle: "استمع للقرآن مع كبار القراء",
  mode_hifz: "الحفظ",
  mode_hifz_subtitle: "تتبع آياتك المحفوظة وراجعها يومياً",
  mode_recitation: "التسميع",
  mode_recitation_subtitle: "راجع حفظك و اختبر نفسك",

  listening_mode_label: "وضع الاستماع",
  reading_mode_label: "وضع القراءة",

  iftar_time: "حان وقت الإفطار! 🎉",
  iftar_dua_text: "ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله",
  time_until_iftar: "⏱️ باقي على الإفطار",
  calculating_time: "جارٍ حساب الوقت...",

  daily_dua_label: "🤲 دعاء اليوم",
  dua_copied: "تم نسخ الدعاء",
  copy_failed: "تعذر النسخ",

  prayer_guide_title: "📖 دليل الصلاة",
  wudu_guide: "كيفية الوضوء",
  prayer_steps_guide: "كيفية الصلاة",
  rakat_count_label: "عدد الركعات",
  recitation_guide: "الجهر والسر في القراءة",
  recitation_guide_desc: "الإمام يجهر بالقراءة في بعض الصلوات ويُسرّ في أخرى",
  prayer_source: "المصدر: صفة صلاة النبي ﷺ — الشيخ الألباني | islamqa.info",
  mode_loud: "جهرًا",
  mode_silent: "سرًا",

  hifz_toast_well_done: "أحسنت! ✨",
  hifz_toast_reviewed_surah: "تمت مراجعة سورة",
  hifz_toast_keep_going: "ستتحسن إن شاء الله",
  hifz_toast_will_appear: "ستظهر سورة {name} في مراجعة الغد",
  hifz_recitation_test_btn: "اختبار التلاوة",
  hifz_recitation_test_desc: "اختبر حفظك بالتلاوة الصوتية",
  hifz_review_count: "تمت مراجعة {count}",
  hifz_review_card_subtitle: "ابدأ مراجعتك اليومية أدناه",
  hifz_review_card_title_singular: "لديك {count} سورة للمراجعة اليوم",
  hifz_review_card_title_plural: "لديك {count} سور للمراجعة اليوم",
  hifz_open_surah_read: "اقرأ السورة",
  hifz_open_surah_listen: "استمع للسورة",
  hifz_did_you_review: "هل راجعت {name}؟",
  hifz_action_start_reading: "ابدأ القراءة",
  hifz_action_start_listening: "استمع",
  hifz_action_continue_reading: "واصل القراءة",
  hifz_action_listen: "استمع",
  hifz_action_read_to_review: "اقرأ للمراجعة",
  hifz_action_listen_to_review: "استمع للمراجعة",
  hifz_action_mark_in_progress: "جارٍ الحفظ",
  hifz_action_mark_memorized: "محفوظة",
  hifz_action_mark_not_started: "إعادة",
  hifz_welcome_title: "ابدأ رحلة الحفظ",
  hifz_welcome_subtitle: "حدد السور التي تحفظها أو تقرأها لتتبع تقدمك",
  hifz_start_with_fatiha: "ابدأ بسورة الفاتحة",

  settings_toast_preview_timeout: "انتهت مهلة تحميل المعاينة",
  settings_toast_preview_error: "تعذر تشغيل المعاينة",
  settings_toast_download_failed: "فشل تحميل القرآن، تحقق من الاتصال بالإنترنت",
  settings_toast_quran_downloaded: "تم تحميل القرآن الكريم بالكامل",
  settings_toast_data_cleared: "تم مسح البيانات المحملة",
  settings_toast_audio_downloaded: "تم تحميل جميع التلاوات",
  settings_toast_audio_cleared: "تم مسح جميع التلاوات",
  settings_toast_tafsir_cleared: "تم مسح جميع التفاسير المحملة",
  settings_toast_verify_failed: "فشل التحقق من التحميلات",
  settings_toast_recitation_downloaded: "تم تحميل التلاوة",
  settings_toast_recitation_failed: "فشل تحميل التلاوة",

  could_not_play_audio: "تعذر تشغيل الصوت",
};

const en: Translations = {
  nav_quran: "Quran",
  nav_azkar: "Azkar",
  nav_prayer: "Prayer",
  nav_tasbeeh: "Tasbeeh",
  nav_settings: "Settings",
  nav_ramadan: "Ramadan",

  back: "Back",
  close: "Close",
  retry: "Try Again",
  loading: "Loading...",
  search: "Search",
  save: "Save",
  reset: "Reset",
  cancel: "Cancel",
  confirm: "Confirm",
  copied: "Copied",
  share: "Share",
  today: "Today",
  ayah: "verse",
  ayahs: "verses",
  surah: "Surah",
  page: "Page",
  minutes_abbr: "min",
  ok: "OK",
  hour: "hr",
  minute: "min",
  second: "sec",
  days: "days",
  day: "Day",
  overdue: "overdue",
  km: "km",
  meters: "m",

  quran_title: "The Wise Quran",
  continue_reading: "Continue Reading",
  search_placeholder: "Search by name, number, or verse text...",
  daily_goal: "Daily Goal",
  surah_list: "Surahs",
  juz_list: "Juz",
  bookmarks: "Bookmarks",
  favorites: "Favorites",
  history: "History",
  reading_history: "Reading History",
  statistics: "Statistics",
  memorization: "Memorization",
  revelation_meccan: "Meccan",
  revelation_medinan: "Medinan",
  no_bookmarks: "No bookmarks yet",
  no_favorites: "No favorite surahs",
  no_history: "No reading history",
  goal_complete: "MashaAllah! You completed your daily goal",

  tab_text: "Text",
  text_tab: "Text",
  tab_translation: "Translation",
  translation_tab: "Translation",
  tab_tafsir: "Tafsir",
  tafsir_tab: "Tafsir",
  focus_mode: "Focus Mode",
  mushaf_view: "Mushaf View",
  ayah_view: "Verse View",
  tafsir_of_ayah: "Tafsir of Verse",
  show_full_tafsir: "← Show full surah tafsir",
  search_tafsir: "Search tafsir...",
  no_tafsir_results: "No results for",
  no_tafsir: "No tafsir available",
  no_translation: "No translation available",
  jump_to_ayah: "Jump to verse...",
  go_to_page: "Go to page",
  go: "Go",
  page_out_of_range: "Page outside surah range",
  invalid_page: "Invalid page number",
  loading_surah: "Loading surah...",
  surah_load_error: "Could not load surah. Check your internet connection.",
  error_loading: "Failed to load",
  bismillah: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",

  translation_header: "Quran Translation",

  now_playing: "Now Playing",
  playing: "Playing",
  reciter: "Reciter",
  of: "of",
  download: "Download",
  downloaded: "Downloaded",
  audio_unavailable_offline: "Audio unavailable offline — download first",
  audio_disclaimer: "Audio may stop automatically depending on device and browser settings",

  azkar_title: "Azkar & Duas",
  azkar_subtitle: "Daily remembrance",
  morning_azkar: "Morning Azkar",
  evening_azkar: "Evening Azkar",
  sleep_azkar: "Sleep Azkar",
  prayer_azkar: "Prayer Azkar",
  all_categories: "All",
  favorites_only: "Favorites",
  azkar_done: "Well done! You completed this dhikr",
  azkar_reset: "Reset",
  times: "times",
  no_favorites_azkar: "No favorite adhkar yet",
  azkar_search: "Search adhkar",
  azkar_no_results: "No results found",

  prayer_title: "Prayer Times",
  prayers_title: "My Prayers Today",
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  next_prayer: "Next Prayer",
  location_required: "Location Required",
  qibla: "Qibla",
  prayer_guide: "Prayer Guide",
  prayers_completed: "prayers completed",
  prayer_countdown: "Time Remaining",
  location_detecting: "Detecting location...",
  location_error: "Could not detect location",
  qibla_banner: "Qibla Direction 🕋",
  qibla_subtitle: "Find the direction of the Kaaba",
  days_streak: "days",
  prayers_complete: "MashaAllah! 🎉",
  complete_prayers: "Complete your prayers",

  tasbeeh_title: "Dhikr Counter",
  set_target: "Set target",
  target: "Target",
  total_today: "Today's Total",
  today_total: "Today's Total",
  counter_complete: "MashaAllah!",
  mashaallah: "MashaAllah! 🎉",

  hifz_title: "Memorization Tracker",
  hifz_subtitle: "Track your Quran memorization progress",
  memorized: "Memorized",
  in_progress: "In Progress",
  not_started: "Not Started",
  todays_review: "Today's Review",
  today_review: "Today's Review",
  no_reviews_today: "No reviews today",
  review_done_all: "Well done! All reviews completed",
  all_reviews_done: "Well done! All reviews completed 🎉",
  start_hifz: "Mark surahs as memorized to begin review",
  add_memorized_hint: "Mark surahs as memorized to start reviewing",
  mastered: "Mastered",
  needs_review: "Needs Review",
  overdue_days: "overdue",
  strength: "Strength",
  in_review: "In Review",
  due_today: "Due Today",
  total_reviews: "Total Reviews",
  avg_streak: "Avg. Streak",
  next_review: "Next Review",
  mark_memorized: "Memorized",
  mark_in_progress: "In Progress",
  mark_not_started: "Not Started",
  all_surahs: "All Surahs",
  memorized_surahs: "Memorized",
  in_progress_surahs: "In Progress",
  filter_all: "All",
  no_surahs_in_filter: "No surahs in this category",
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",

  stats_title: "Statistics",
  total_ayahs: "Total Verses",
  reading_minutes: "Reading Minutes",
  streak_days: "Day Streak",
  longest_streak: "Longest Streak",
  this_week: "This Week",
  this_month: "This Month",
  weekly_reading: "Weekly Reading",
  monthly_calendar: "Monthly Calendar",
  achievements: "Achievements",
  goal_today: "Today's Goal",
  today_goal: "Today's Goal",

  settings_title: "Settings",
  settings_subtitle: "App settings",
  appearance: "Appearance & Reading",
  theme_light: "Light",
  theme_dark: "Dark",
  theme_dark_mode: "Dark Mode",
  font_size: "Font Size",
  quran_font_size: "Quran Font Size",
  ui_scale: "UI Scale",
  scale_normal: "Normal",
  scale_large: "Large",
  scale_xlarge: "Larger",
  reciter_section: "Reciter",
  tafsir_section: "Tafsir",
  translation_section: "Translation",
  show_translation: "Show Translation",
  show_translation_subtitle: "Show Quran translation",
  prayer_notifications: "Prayer Notifications",
  prayer_time_reminder: "Prayer Time Reminders",
  prayer_time_reminder_enabled: "Prayer time notifications enabled",
  prayer_time_reminder_disabled: "Prayer time notifications disabled",
  prayer_time_hint: "You will be notified at each prayer time",
  prayer_notifications_denied: "Notification permission denied — please enable it in browser settings",
  notifications_not_supported: "This browser does not support notifications",
  notifications_permission_denied: "Notification permission denied, please enable it in browser settings",
  azkar_reminder: "Morning & Evening Azkar Reminder",
  azkar_reminder_enabled: "Azkar reminder enabled",
  azkar_reminder_disabled: "Azkar reminder disabled",
  azkar_reminder_hint: "Reminded at Fajr and Maghrib to read your Azkar",
  reading_reminder: "Daily Reading Reminder",
  reading_reminder_enabled: "Daily reading reminder enabled",
  reading_reminder_disabled: "Daily reading reminder disabled",
  reading_reminder_hint: "Get reminded every day to read your Quran",
  reading_reminder_time: "Reminder time",
  prayer_method: "Prayer Calculation Method",
  daily_reading_goal: "Daily Reading Goal",
  daily_verse_count: "Daily verse count",
  downloads: "Downloads",
  downloads_quran_text: "Quran Texts",
  downloads_quran_desc: "Download surahs for offline reading",
  downloads_audio: "Audio Recitations",
  downloads_audio_desc: "Download recitations for offline listening",
  downloads_clear_all: "Clear All",
  downloads_download_all: "Download All",
  downloads_complete: "Complete",
  downloads_downloading: "Downloading...",
  downloads_downloading_audio: "Downloading recitations...",
  downloads_verifying: "Verifying...",
  downloads_clear_audio: "Clear Audio",
  downloads_verify: "Verify Downloads",
  downloads_show_details: "Show Details",
  downloads_hide_details: "Hide Details",
  downloads_confirm_clear_audio_title: "Clear all recitations?",
  downloads_confirm_clear_audio_desc: "All downloaded audio files will be deleted. You can re-download them later.",
  downloads_confirm_yes: "Yes, Clear All",
  install_app: "Install App",
  install_app_ios_intro: "To install the app on your device:",
  install_app_intro: "To install the app on your device:",
  install_app_already: "App is already installed",
  storage: "Storage",
  storage_total: "Total Storage",
  storage_quran_text: "Quran Texts",
  storage_surahs_count: "surahs",
  storage_audio: "Audio Recitations",
  storage_audio_count: "audio files",
  storage_tafsir: "Tafsir",
  storage_tafsir_count: "surahs",
  storage_empty: "No downloaded data",
  storage_confirm_clear_tafsir_title: "Clear all tafsir?",
  storage_confirm_clear_tafsir_desc: "All downloaded tafsir will be deleted. You can re-download them later.",
  reset_progress: "Reset Progress",
  reset_progress_desc: "This will clear reading history, bookmarks, favorites, and daily goals. Downloaded data will not be deleted.",
  reset_progress_confirm_title: "Reset all progress?",
  reset_progress_confirm_desc: "This will clear: last read position, bookmarks, favorite surahs, daily goal, reading history, and streak. Are you sure?",
  reset_progress_confirm_btn: "Yes, Reset",
  reset_progress_success: "Progress reset successfully",
  ramadan_tab: "Ramadan Tab",
  ramadan_show_tab: "Show Ramadan Tab",
  ramadan_show_tab_desc: "Tab appears automatically during Ramadan only",
  ramadan_tab_shown: "Ramadan tab is now visible",
  ramadan_tab_hidden: "Ramadan tab is now hidden",
  about: "About",
  about_description: "A Quran, Azkar & Prayer app",
  version: "Version",
  changelog: "Changelog",
  share_app: "Share App",
  share_app_text: "The Noble Quran & Azkar app — Download now!",
  check_updates: "Check for Updates",
  up_to_date: "You're on the latest version",
  up_to_date_desc: "App is fully up to date",
  language: "Language",
  language_arabic: "العربية",
  language_english: "English",
  audio_preview: "Preview audio",

  qibla_title: "Qibla Direction",
  qibla_description: "Compass towards the Holy Kaaba",
  qibla_direction: "Qibla Direction",
  qibla_aligned: "Facing the Qibla",
  qibla_rotate: "Rotate your device",
  distance_to_kaaba: "Distance to Kaaba",
  compass_accuracy: "Compass accuracy:",
  accuracy_high: "High",
  accuracy_medium: "Medium",
  accuracy_low: "Low",
  lock_compass: "Lock Compass",
  compass_locked: "Compass Locked",
  unlock_compass: "Unlock",
  calibrate: "Calibrate",
  location_permission: "Location permission required",
  compass_not_supported: "Compass not supported on this device",
  km_away: "km",
  your_location: "Your Location",
  location_accuracy: "Location accuracy:",
  facing_qibla: "✓ You are facing the Qibla",
  move_device: "Move your device to activate compass",
  calibration_title: "Compass Calibration",
  calibration_desc: "To improve compass accuracy, move your device in a figure-8 motion several times.",
  allow_compass: "Please allow compass access",
  sensor_error: "Could not access orientation sensor",

  ramadan_title: "Ramadan Kareem 🌙",
  ramadan_day: "Day",
  ramadan_of: "of Ramadan",
  iftar_countdown: "Time until Iftar",
  suhoor_countdown: "Time until Suhoor",
  daily_dua: "Daily Dua",
  ramadan_tips: "Ramadan Tips",
  daily_checklist: "Daily Checklist ✅",
  khatmah_plan: "Ramadan Khatmah 📖",
  juz_parts: "Juz",
  today_juz: "Today's Juz",
  complete: "Complete ✓",
  done: "Done",
  activities_title: "Virtues and Duas 🤲",
  ramadan_error_msg: "Could not load Ramadan data. Please try again.",
  error_title: "An error occurred",
  error_retry: "Retry",

  daily_ayah: "Verse of the Day",
  daily_wird: "Daily Wird",
  start_khatm_plan: "Start a Khatm Plan",
  percent_of_khatm: "% of Khatm",
  restart: "Restart",
  days_plan: "days",

  reading_time_up: "Reading time is up 📖",

  close_focus: "Close Focus Mode",

  achievements_title: "Achievements",
  achievements_subtitle: "Track your reading achievements",
  unlocked: "Unlocked",
  locked: "Locked",
  overall_progress: "Overall Progress",
  new_achievement: "🎉 New Achievement!",
  achievement_streak: "Streak",
  achievement_reading: "Reading",
  achievement_hifz: "Memorization",
  achievement_goals: "Goals",

  whats_new: "What's New in Version",
  update_notes: "Update Notes",
  app_updated: "App updated successfully",
  app_updated_title: "App Updated ✓",
  show_all_changelog: "Show all changelog",
  ok_thanks: "OK, Thanks!",
  whats_new_button: "What's New?",
  update_auto_dismiss: "Auto-closing in...",
  tafsir_english_note: "Showing English interpretation",

  install_title: "Install App",
  install_description: "Add to your home screen for quick access",
  install_button: "Install",
  install_dismiss: "Later",
  install_subtitle: "Quick access without browser",
  install: "Install",

  update_available: "New Update Available",
  update_description: "Tap to update and get the latest features",
  update_now: "Update Now",
  updating: "Updating...",
  update: "Update",

  not_found: "Page Not Found",
  go_home: "Go to Home",

  recitation_test: "Recitation Test",
  recitation_subtitle: "Test your memorization by reciting aloud",
  select_surah: "Select Surah",
  select_range: "Verse Range",
  verse_from: "From verse",
  verse_to: "To verse",
  start_test: "Start Test",
  tap_to_speak: "Tap to Recite",
  listening: "Listening...",
  stop_listening: "Stop",
  processing: "Analyzing audio...",
  test_result: "Test Result",
  your_score: "Your Score",
  correct_ayahs: "Correct Verses",
  out_of: "out of",
  try_again: "Try Again",
  excellent: "Excellent! Well done",
  good_job: "Good job! Keep practicing",
  keep_practicing: "Needs more review",
  speech_not_supported: "Microphone Not Available",
  speech_not_supported_desc: "The test requires microphone access. Please allow microphone permissions in your browser settings.",
  no_speech_detected: "No speech detected. Please try again.",
  recitation_history: "Test History",
  best_score: "Best Score",
  per_ayah_breakdown: "Per-Verse Breakdown",
  correct: "Correct",
  incorrect: "Incorrect",
  verses: "verses",
  strictness: "Accuracy Level",
  strictness_lenient: "Lenient",
  strictness_normal: "Normal",
  strictness_strict: "Strict",
  islamic_feedback_excellent: "Mashallah! Barakallahu feek",
  islamic_feedback_good: "Well done! Keep practicing",
  islamic_feedback_weak: "Jazakallahu khairan — keep reviewing",
  my_progress: "My Progress",
  accuracy_over_time: "Accuracy Over Time",
  no_progress_data: "No history yet. Start a test to track your progress.",
  partial: "Partial",
  listening_tab: "Listening",
  playback_speed: "Playback Speed",
  verse_repeat: "Verse Repeat",
  repeat_off: "Off",
  repeat_times: "times",
  now_playing_verse: "Now Playing Verse",
  speed_label: "Speed",
  reciter_label: "Reciter",
  listening_hint: "Listen to Quran with verse tracking",
  hifz_streak: "Memorization Streak",
  hifz_streak_days: "day streak",
  daily_hifz_goal: "Daily Goal",
  goal_surahs_per_day: "surahs/day",
  goal_ayahs_per_day: "verses/day",
  set_goal: "Set Goal",
  todays_goal_progress: "Today's Goal Progress",
  hifz_goal_done: "MashaAllah! Daily goal complete",
  reading_progress: "Reading Progress",

  mode_reading: "Reading",
  mode_reading_subtitle: "Browse and read the Holy Quran",
  mode_listening: "Listening",
  mode_listening_subtitle: "Listen with renowned reciters",
  mode_hifz: "Memorization",
  mode_hifz_subtitle: "Review and test your memorization",
  mode_recitation: "Recitation Test",
  mode_recitation_subtitle: "Test your recitation with microphone",

  listening_mode_label: "Listening Mode",
  reading_mode_label: "Reading Mode",

  iftar_time: "Iftar Time! 🎉",
  iftar_dua_text: "Thirst is gone, the veins are refreshed, and the reward is confirmed — if Allah wills",
  time_until_iftar: "⏱️ Time until Iftar",
  calculating_time: "Calculating...",

  daily_dua_label: "🤲 Daily Dua",
  dua_copied: "Dua copied",
  copy_failed: "Failed to copy",

  prayer_guide_title: "📖 Prayer Guide",
  wudu_guide: "How to Perform Wudu",
  prayer_steps_guide: "How to Perform Salah",
  rakat_count_label: "Rak'ahs",
  recitation_guide: "Audible & Silent Recitation",
  recitation_guide_desc: "The imam recites aloud in some prayers and silently in others",
  prayer_source: "Source: Prayer description from the Sunnah of the Prophet ﷺ | islamqa.info",
  mode_loud: "Aloud",
  mode_silent: "Silent",

  hifz_toast_well_done: "Well done! ✨",
  hifz_toast_reviewed_surah: "Reviewed Surah",
  hifz_toast_keep_going: "Keep going, you'll improve",
  hifz_toast_will_appear: "Surah {name} will appear in tomorrow's review",
  hifz_recitation_test_btn: "Recitation Test",
  hifz_recitation_test_desc: "Test your memory with voice recitation",
  hifz_review_count: "Reviewed {count}",
  hifz_review_card_subtitle: "Start your daily review below",
  hifz_review_card_title_singular: "You have {count} surah to review today",
  hifz_review_card_title_plural: "You have {count} surahs to review today",
  hifz_open_surah_read: "Read Surah",
  hifz_open_surah_listen: "Listen to Surah",
  hifz_did_you_review: "Did you review {name}?",
  hifz_action_start_reading: "Start Reading",
  hifz_action_start_listening: "Listen",
  hifz_action_continue_reading: "Continue Reading",
  hifz_action_listen: "Listen",
  hifz_action_read_to_review: "Read to Review",
  hifz_action_listen_to_review: "Listen to Review",
  hifz_action_mark_in_progress: "Mark In Progress",
  hifz_action_mark_memorized: "Mark Memorized",
  hifz_action_mark_not_started: "Reset",
  hifz_welcome_title: "Start Your Hifz Journey",
  hifz_welcome_subtitle: "Mark surahs you're memorizing or reading to track your progress",
  hifz_start_with_fatiha: "Start with Al-Fatiha",

  settings_toast_preview_timeout: "Preview timed out",
  settings_toast_preview_error: "Could not play preview",
  settings_toast_download_failed: "Download failed, check your internet connection",
  settings_toast_quran_downloaded: "The entire Quran has been downloaded",
  settings_toast_data_cleared: "Downloaded data cleared",
  settings_toast_audio_downloaded: "All recitations downloaded",
  settings_toast_audio_cleared: "All recitations cleared",
  settings_toast_tafsir_cleared: "All downloaded tafsir cleared",
  settings_toast_verify_failed: "Failed to verify downloads",
  settings_toast_recitation_downloaded: "Recitation downloaded",
  settings_toast_recitation_failed: "Failed to download recitation",

  could_not_play_audio: "Could not play audio",
};

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: keyof Translations) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useLocalStorage<AppLanguage>("wise-language", "ar");
  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;

    if (language === "en") {
      localStorage.setItem("wise-translation-enabled", "true");
    } else {
      localStorage.setItem("wise-translation-enabled", "false");
    }
  }, [language, isRTL]);

  const t = (key: keyof Translations): string => {
    const dict = language === "en" ? en : ar;
    return dict[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
