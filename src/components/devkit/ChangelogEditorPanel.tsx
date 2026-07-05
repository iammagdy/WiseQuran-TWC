import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { DK, downloadJson, exportFilename } from "./devkit-utils";
import { changelog as staticChangelog, type ChangelogEntry, type ChangelogCategory } from "@/data/changelog";
import {
  getDevkitChangelog,
  setDevkitChangelog,
  DEVKIT_CHANGELOG_KEY,
  getEffectiveVersion,
  setEffectiveVersion,
  clearEffectiveVersionOverride,
  DEVKIT_CURRENT_VERSION_KEY,
} from "@/lib/changelog-overrides";
import { APP_VERSION } from "@/data/changelog";
import { VersionBlock } from "@/components/ChangelogModal";
import { useLanguage } from "@/contexts/LanguageContext";

type CatKey = keyof ChangelogCategory;
const CAT_KEYS: CatKey[] = ["features", "improvements", "fixes"];
const CAT_LABELS: Record<CatKey, { en: string; ar: string }> = {
  features:     { en: "Features",     ar: "مميزات" },
  improvements: { en: "Improvements", ar: "تحسينات" },
  fixes:        { en: "Fixes",        ar: "إصلاحات" },
};

interface FormState {
  version: string;
  date: string;
  en: Record<CatKey, string>;
  ar: Record<CatKey, string>;
}

function blankForm(): FormState {
  return {
    version: "",
    date: new Date().toISOString().slice(0, 10),
    en: { features: "", improvements: "", fixes: "" },
    ar: { features: "", improvements: "", fixes: "" },
  };
}

function entryToForm(e: ChangelogEntry): FormState {
  const lines = (items?: string[]) => (items ?? []).join("\n");
  return {
    version: e.version,
    date: e.date,
    en: { features: lines(e.en.features), improvements: lines(e.en.improvements), fixes: lines(e.en.fixes) },
    ar: { features: lines(e.ar.features), improvements: lines(e.ar.improvements), fixes: lines(e.ar.fixes) },
  };
}

function formToEntry(f: FormState): ChangelogEntry {
  const parseLines = (text: string) =>
    text.split("\n").map((s) => s.trim()).filter(Boolean);
  const buildCat = (lang: Record<CatKey, string>): ChangelogCategory => {
    const cat: ChangelogCategory = {};
    for (const k of CAT_KEYS) {
      const items = parseLines(lang[k]);
      if (items.length) cat[k] = items;
    }
    return cat;
  };
  return {
    version: f.version.trim(),
    date: f.date,
    en: buildCat(f.en),
    ar: buildCat(f.ar),
  };
}

function EntryPreviewModal({
  entry,
  onClose,
}: {
  entry: ChangelogEntry;
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const [previewLang, setPreviewLang] = useState<"en" | "ar">(language as "en" | "ar");
  const isRTL = previewLang === "ar";
  const labelPreview = previewLang === "ar" ? "معاينة المدخل" : "Entry Preview";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          dir={isRTL ? "rtl" : "ltr"}
          className="bg-card rounded-3xl shadow-2xl border border-border/50 w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative px-6 pt-5 pb-3 border-b border-border/40 flex items-center gap-3">
            <span className="font-semibold text-sm text-foreground/80">{labelPreview}</span>
            <div className="flex items-center gap-1 ms-2 rounded-lg bg-muted/40 p-0.5">
              <button
                onClick={() => setPreviewLang("en")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  previewLang === "en"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Preview in English"
                aria-pressed={previewLang === "en"}
              >
                EN
              </button>
              <button
                onClick={() => setPreviewLang("ar")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  previewLang === "ar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Preview in Arabic"
                aria-pressed={previewLang === "ar"}
              >
                AR
              </button>
            </div>
            <button
              onClick={onClose}
              className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors`}
              aria-label="Close preview"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 overscroll-contain">
            <VersionBlock entry={entry} language={previewLang} entryIndex={0} />
          </div>
          <div className="border-t border-border/40 px-5 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              {previewLang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EntryForm({
  form,
  setForm,
  onSave,
  onCancel,
  isEditing,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const previewEntry = formToEntry(form);

  return (
    <div className={`rounded-lg ${DK.card} p-4 space-y-4`}>
      <p className={`font-mono text-xs font-semibold ${DK.text}`}>
        {isEditing ? `Editing v${form.version}` : "New Changelog Entry"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`font-mono text-[11px] ${DK.muted} block mb-1`}>Version</label>
          <input
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            placeholder="e.g. 3.6.0"
            className={`w-full font-mono text-xs px-3 py-2 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd]`}
          />
        </div>
        <div>
          <label className={`font-mono text-[11px] ${DK.muted} block mb-1`}>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={`w-full font-mono text-xs px-3 py-2 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd]`}
          />
        </div>
      </div>

      {(["en", "ar"] as const).map((lang) => (
        <div key={lang}>
          <p className={`font-mono text-xs font-semibold ${DK.blue} mb-2`}>
            {lang === "en" ? "English" : "Arabic (العربية)"}
          </p>
          <div className="space-y-2">
            {CAT_KEYS.map((cat) => (
              <div key={cat}>
                <label className={`font-mono text-[11px] ${DK.muted} block mb-1`}>
                  {lang === "en" ? CAT_LABELS[cat].en : CAT_LABELS[cat].ar} — one line per item
                </label>
                <textarea
                  value={form[lang][cat]}
                  onChange={(e) =>
                    setForm({ ...form, [lang]: { ...form[lang], [cat]: e.target.value } })
                  }
                  rows={2}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  placeholder={`Each line = one item`}
                  className={`w-full font-mono text-xs px-3 py-2 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd] resize-y`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onSave} className={`${DK.btnBase} ${DK.btnGreen}`}>
          {isEditing ? "Update Entry" : "Save Entry"}
        </button>
        <button onClick={() => setShowPreview(true)} className={`${DK.btnBase} ${DK.btnGray}`}>
          Preview
        </button>
        <button onClick={onCancel} className={`${DK.btnBase} ${DK.btnGray}`}>
          Cancel
        </button>
        <p className={`font-mono text-[11px] ${DK.muted} ms-auto`}>
          Appears in-app after next reload
        </p>
      </div>

      {showPreview && (
        <EntryPreviewModal entry={previewEntry} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  isDevKit,
  isCurrent,
  onEdit,
  onDelete,
  onSetCurrent,
}: {
  entry: ChangelogEntry;
  isDevKit: boolean;
  isCurrent: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetCurrent?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const total =
    (entry.en.features?.length ?? 0) +
    (entry.en.improvements?.length ?? 0) +
    (entry.en.fixes?.length ?? 0);

  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer group hover:bg-[#21262d] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
          v{entry.version}
        </span>
        <span className={`font-mono text-[11px] ${DK.muted} w-24 shrink-0`}>{entry.date}</span>
        <span className={`font-mono text-[11px] ${DK.muted} flex-1`}>{total} items</span>
        {isCurrent && (
          <span className={`font-mono text-[10px] ${DK.yellow} shrink-0 me-1`} title="This is the effective current version">
            ★ current
          </span>
        )}
        <div
          className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {onSetCurrent && !isCurrent && (
            <button
              onClick={onSetCurrent}
              className={`${DK.btnBase} ${DK.btnGray} px-2 py-0.5 text-[11px]`}
              title="Mark as the current version shown in the app"
            >
              ★ Set current
            </button>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className={`${DK.btnBase} ${DK.btnGray} px-2 py-0.5 text-[11px]`}
          >
            Preview
          </button>
          {isDevKit ? (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className={`${DK.btnBase} ${DK.btnGray} px-2 py-0.5 text-[11px]`}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className={`${DK.btnBase} ${DK.btnRed} px-2 py-0.5 text-[11px]`}
                >
                  ×
                </button>
              )}
            </>
          ) : (
            <span className={`font-mono text-[10px] ${DK.subtle} shrink-0`}>built-in</span>
          )}
        </div>
        <span className={`font-mono text-[10px] ${DK.muted} ms-1`}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-3 pt-1 bg-[#0d1117] space-y-2">
          {CAT_KEYS.map((cat) => {
            const items = entry.en[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat}>
                <p className={`font-mono text-[10px] uppercase tracking-widest ${DK.muted} mb-1`}>
                  {CAT_LABELS[cat].en}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item, i) => (
                    <li
                      key={i}
                      className={`font-mono text-xs ${DK.text} ps-2 border-l-2 border-[#388bfd]/40`}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {showPreview && (
        <EntryPreviewModal entry={entry} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

interface PendingChangelogImport {
  entries: ChangelogEntry[];
  mode: "merge" | "replace";
}

export default function ChangelogEditorPanel() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [effectiveVer, setEffectiveVer] = useState(() => getEffectiveVersion());
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [toast, setToast] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingChangelogImport | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setEntries(getDevkitChangelog());
    setEffectiveVer(getEffectiveVersion());
  };

  useEffect(() => {
    load();
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (
        !ce.detail?.key ||
        ce.detail.key === DEVKIT_CHANGELOG_KEY ||
        ce.detail.key === DEVKIT_CURRENT_VERSION_KEY
      ) {
        load();
      }
    };
    window.addEventListener("local-storage-sync", handler);
    return () => window.removeEventListener("local-storage-sync", handler);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const save = () => {
    const entry = formToEntry(form);
    if (!entry.version) return flash("❌ Version string is required");
    const others = entries.filter((e) => e.version !== editing);
    setDevkitChangelog([entry, ...others]);
    setEditing(null);
    setAdding(false);
    setForm(blankForm());
    flash(`✓ Saved v${entry.version}`);
    load();
  };

  const del = (version: string) => {
    if (!confirm(`Delete changelog entry v${version}?`)) return;
    setDevkitChangelog(entries.filter((e) => e.version !== version));
    flash(`✓ Deleted v${version}`);
    load();
  };

  const startEdit = (entry: ChangelogEntry) => {
    setEditing(entry.version);
    setAdding(false);
    setForm(entryToForm(entry));
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setForm(blankForm());
  };

  const setCurrent = (version: string) => {
    setEffectiveVersion(version);
    setEffectiveVer(version);
    flash(`✓ Current version set to v${version}`);
  };

  const resetCurrentVersion = () => {
    clearEffectiveVersionOverride();
    setEffectiveVer(APP_VERSION);
    flash(`✓ Reset to static v${APP_VERSION}`);
  };

  const handleExport = () => {
    const current = getDevkitChangelog();
    downloadJson(current, exportFilename("devkit-changelog"));
    flash(`✓ Exported ${current.length} custom entr${current.length === 1 ? "y" : "ies"}`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) {
          flash("❌ Invalid file: expected a JSON array of entries");
          return;
        }
        const validEntries = (parsed as unknown[]).filter(
          (item): item is ChangelogEntry =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).version === "string" &&
            typeof (item as Record<string, unknown>).date === "string"
        );
        if (validEntries.length === 0) {
          flash("❌ No valid changelog entries found in file");
          return;
        }
        setPendingImport({ entries: validEntries, mode: "merge" });
      } catch {
        flash("❌ Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const { entries: incoming, mode } = pendingImport;
    if (mode === "replace") {
      setDevkitChangelog(incoming);
    } else {
      const currentVersions = new Map(entries.map((e) => [e.version, e]));
      for (const entry of incoming) {
        currentVersions.set(entry.version, entry);
      }
      setDevkitChangelog(Array.from(currentVersions.values()));
    }
    setPendingImport(null);
    flash(`✓ Imported ${incoming.length} entr${incoming.length === 1 ? "y" : "ies"} (${mode})`);
    load();
  };

  const cancelImport = () => {
    setPendingImport(null);
  };

  const isFormOpen = adding || editing !== null;
  const devkitVersions = new Set(entries.map((e) => e.version));
  const staticEntries = staticChangelog.filter((e) => !devkitVersions.has(e.version));
  const isVersionOverridden = effectiveVer !== APP_VERSION;

  return (
    <div className="space-y-4">
      {/* Current version status bar */}
      <div className={`rounded-lg ${DK.card} px-4 py-3 flex items-center gap-3`}>
        <div className="flex-1">
          <p className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted} mb-0.5`}>
            Effective current version
          </p>
          <p className={`font-mono text-sm font-bold ${isVersionOverridden ? DK.yellow : DK.text}`}>
            v{effectiveVer}
            {isVersionOverridden && (
              <span className={`ms-2 font-mono text-[10px] ${DK.muted}`}>
                (static: v{APP_VERSION})
              </span>
            )}
          </p>
        </div>
        {isVersionOverridden && (
          <button
            onClick={resetCurrentVersion}
            className={`${DK.btnBase} ${DK.btnGray} text-[11px]`}
          >
            Reset to v{APP_VERSION}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {toast ? (
          <div
            className={`flex-1 rounded px-3 py-1.5 font-mono text-xs ${
              toast.startsWith("❌")
                ? `bg-[#6e1c1c]/30 border border-[#f85149] ${DK.red}`
                : `bg-[#238636]/20 border border-[#238636] ${DK.green}`
            }`}
          >
            {toast}
          </div>
        ) : (
          <p className={`flex-1 font-mono text-xs ${DK.muted}`}>
            DevKit entries layer on top of static ones. Reload the app to see changes.
          </p>
        )}
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button onClick={handleExport} className={`${DK.btnBase} ${DK.btnGray}`}>
            Export entries
          </button>
          <button onClick={() => importRef.current?.click()} className={`${DK.btnBase} ${DK.btnGray}`}>
            Import entries
          </button>
          <button
            onClick={() => { setAdding(true); setEditing(null); setForm(blankForm()); }}
            disabled={isFormOpen}
            className={`${DK.btnBase} ${DK.btnGreen}`}
          >
            + New Entry
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Import preview */}
      {pendingImport && (
        <div className={`rounded-lg ${DK.card} p-4 space-y-3`}>
          <p className={`font-mono text-xs font-semibold ${DK.yellow}`}>
            Import Preview — {pendingImport.entries.length} entr{pendingImport.entries.length === 1 ? "y" : "ies"} found
          </p>
          <div className={`rounded bg-[#0d1117] divide-y divide-[#30363d]`}>
            {pendingImport.entries.map((e) => {
              const total =
                (e.en.features?.length ?? 0) +
                (e.en.improvements?.length ?? 0) +
                (e.en.fixes?.length ?? 0);
              const isExisting = devkitVersions.has(e.version);
              return (
                <div key={e.version} className="flex items-center gap-3 px-3 py-2">
                  <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
                    v{e.version}
                  </span>
                  <span className={`font-mono text-[11px] ${DK.muted} w-24 shrink-0`}>{e.date}</span>
                  <span className={`font-mono text-[11px] ${DK.muted} flex-1`}>{total} items</span>
                  {isExisting && (
                    <span className={`font-mono text-[10px] ${DK.yellow}`}>overwrites existing</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <label className={`font-mono text-[11px] ${DK.muted}`}>Import mode:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingImport({ ...pendingImport, mode: "merge" })}
                className={`${DK.btnBase} px-2 py-0.5 text-[11px] ${
                  pendingImport.mode === "merge" ? DK.btnGreen : DK.btnGray
                }`}
              >
                Merge (keep existing)
              </button>
              <button
                onClick={() => setPendingImport({ ...pendingImport, mode: "replace" })}
                className={`${DK.btnBase} px-2 py-0.5 text-[11px] ${
                  pendingImport.mode === "replace" ? DK.btnRed : DK.btnGray
                }`}
              >
                Replace all
              </button>
            </div>
          </div>
          <p className={`font-mono text-[11px] ${DK.muted}`}>
            {pendingImport.mode === "merge"
              ? "Incoming entries will be added or will overwrite entries with matching versions. Other existing entries are kept."
              : "All current DevKit entries will be replaced by the imported entries."}
          </p>
          <div className="flex gap-2">
            <button onClick={confirmImport} className={`${DK.btnBase} ${DK.btnGreen}`}>
              Apply import
            </button>
            <button onClick={cancelImport} className={`${DK.btnBase} ${DK.btnGray}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {isFormOpen && (
        <EntryForm
          form={form}
          setForm={setForm}
          onSave={save}
          onCancel={cancel}
          isEditing={editing !== null}
        />
      )}

      {/* DevKit-authored entries */}
      {entries.length > 0 && (
        <div className={`rounded-lg ${DK.card} overflow-hidden`}>
          <div className={`px-4 py-2.5 border-b ${DK.border} flex items-center gap-2`}>
            <span className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
              DevKit entries
            </span>
            <span className={`font-mono text-xs ${DK.green} ms-auto`}>
              {entries.length} custom
            </span>
          </div>
          <div className="divide-y divide-[#30363d]">
            {entries.map((e) => (
              <EntryRow
                key={e.version}
                entry={e}
                isDevKit
                isCurrent={e.version === effectiveVer}
                onSetCurrent={!isFormOpen ? () => setCurrent(e.version) : undefined}
                onEdit={!isFormOpen ? () => startEdit(e) : undefined}
                onDelete={!isFormOpen ? () => del(e.version) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Static / built-in entries (read-only) */}
      <div className={`rounded-lg ${DK.card} overflow-hidden`}>
        <div className={`px-4 py-2.5 border-b ${DK.border} flex items-center gap-2`}>
          <span className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
            Built-in entries
          </span>
          <span className={`font-mono text-xs ${DK.subtle} ms-auto`}>
            {staticEntries.length} read-only
          </span>
        </div>
        <div className="divide-y divide-[#30363d]">
          {staticEntries.map((e) => (
            <EntryRow
              key={e.version}
              entry={e}
              isDevKit={false}
              isCurrent={e.version === effectiveVer}
              onSetCurrent={!isFormOpen ? () => setCurrent(e.version) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
