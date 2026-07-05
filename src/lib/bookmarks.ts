import {
  bookmarkKey,
  clearAllBookmarks,
  clearBookmarksForOwner,
  deleteBookmark,
  getBookmark,
  getBookmarksForOwner,
  putBookmark,
  V6_BOOKMARKS_BACKUP_LS_KEY,
  type BookmarkRecord,
} from "@/lib/db";
import { enqueuedSupabaseWrite } from "@/lib/syncQueue";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getDeviceId } from "@/hooks/useDeviceId";

export type { BookmarkRecord } from "@/lib/db";
export { bookmarkKey } from "@/lib/db";

const CHANGE_EVENT = "wise-bookmarks-changed";
const LEGACY_KEY = "wise-bookmarks";
const MIGRATION_FLAG = "wise-bookmarks-migrated-v1";
// Per-user record of anonymous bookmark IDs the user has already decided
// about (either merged into their account or explicitly discarded). A
// bookmark ID added to this set is never re-prompted. IDs that are not
// in the set and whose underlying anon record still exists will prompt
// again the next time the user signs in.
const CLAIM_RESOLVED_KEY = (userId: string) => `wise-bm-claim-resolved:${userId}`;

function emitChange(): void {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function subscribeToBookmarkChanges(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

// ─── Ownership helpers ────────────────────────────────────────────────────────

let cachedUserId: string | null = null;

export function setCurrentUserIdCache(id: string | null): void {
  cachedUserId = id;
}

function getCurrentUserId(): string | null {
  if (!isSupabaseConfigured) return null;
  return cachedUserId;
}

interface Ownership {
  ownerKey: string;
  userId: string | null;
  deviceId: string;
}

function computeOwnership(): Ownership | null {
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  const userId = getCurrentUserId();
  if (userId) {
    return { ownerKey: `u:${userId}`, userId, deviceId };
  }
  return { ownerKey: `d:${deviceId}`, userId: null, deviceId };
}

function currentOwnerKey(): string | null {
  return computeOwnership()?.ownerKey ?? null;
}

function anonymousOwnerKey(): string | null {
  const deviceId = getDeviceId();
  return deviceId ? `d:${deviceId}` : null;
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

function syncBookmarkUpsert(record: BookmarkRecord): void {
  if (!isSupabaseConfigured) return;
  const own = computeOwnership();
  if (!own) return;
  // Only sync records that belong to the currently-active owner. Records
  // left over from a previously signed-in user are never pushed under a
  // different owner's key.
  if (record.ownerKey !== own.ownerKey) return;
  void enqueuedSupabaseWrite(
    "device_bookmarks",
    "upsert",
    {
      owner_key: own.ownerKey,
      user_id: own.userId,
      device_id: own.deviceId,
      surah: record.surah,
      ayah: record.ayah,
      ayah_text: record.ayahText,
      surah_name: record.surahName,
      note: record.note,
      bookmarked: record.bookmarked,
      created_at: new Date(record.createdAt).toISOString(),
      updated_at: new Date(record.updatedAt).toISOString(),
      deleted: false,
    },
    { onConflict: "owner_key,surah,ayah" },
  );
}

function syncBookmarkDelete(ownerKey: string, surah: number, ayah: number): void {
  if (!isSupabaseConfigured) return;
  const own = computeOwnership();
  if (!own) return;
  if (ownerKey !== own.ownerKey) return;
  // Offline queue does not support DELETE, so mark the row as deleted via upsert.
  void enqueuedSupabaseWrite(
    "device_bookmarks",
    "upsert",
    {
      owner_key: own.ownerKey,
      user_id: own.userId,
      device_id: own.deviceId,
      surah,
      ayah,
      ayah_text: "",
      surah_name: "",
      note: "",
      bookmarked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted: true,
    },
    { onConflict: "owner_key,surah,ayah" },
  );
}

// ─── Local CRUD ───────────────────────────────────────────────────────────────

export interface UpsertBookmarkInput {
  surah: number;
  ayah: number;
  ayahText?: string;
  surahName?: string;
  note?: string;
  bookmarked?: boolean;
}

async function writeOrPrune(record: BookmarkRecord): Promise<void> {
  if (!record.bookmarked && !record.note) {
    await deleteBookmark(record.ownerKey, record.surah, record.ayah);
    syncBookmarkDelete(record.ownerKey, record.surah, record.ayah);
  } else {
    await putBookmark(record);
    syncBookmarkUpsert(record);
  }
}

/**
 * Add or update a bookmark / note for the **current owner**. For new
 * records `bookmarked` defaults to `false` — callers must explicitly
 * set `bookmarked: true` to bookmark an ayah.
 */
export async function upsertBookmark(input: UpsertBookmarkInput): Promise<BookmarkRecord | null> {
  const ownerKey = currentOwnerKey();
  if (!ownerKey) return null;
  const now = Date.now();
  const existing = await getBookmark(ownerKey, input.surah, input.ayah);
  const record: BookmarkRecord = {
    id: bookmarkKey(ownerKey, input.surah, input.ayah),
    ownerKey,
    surah: input.surah,
    ayah: input.ayah,
    ayahText: input.ayahText ?? existing?.ayahText ?? "",
    surahName: input.surahName ?? existing?.surahName ?? "",
    note: input.note !== undefined ? input.note : existing?.note ?? "",
    bookmarked:
      input.bookmarked !== undefined
        ? input.bookmarked
        : existing?.bookmarked ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await writeOrPrune(record);
  emitChange();
  return record;
}

/**
 * Toggle the bookmark flag for the current owner, preserving any
 * existing note on the ayah.
 */
export async function toggleBookmarkFlag(input: UpsertBookmarkInput): Promise<void> {
  const ownerKey = currentOwnerKey();
  if (!ownerKey) return;
  const existing = await getBookmark(ownerKey, input.surah, input.ayah);
  const nextFlag = !(existing?.bookmarked ?? false);
  await upsertBookmark({ ...input, bookmarked: nextFlag });
}

export async function removeBookmark(surah: number, ayah: number): Promise<void> {
  const ownerKey = currentOwnerKey();
  if (!ownerKey) return;
  await deleteBookmark(ownerKey, surah, ayah);
  syncBookmarkDelete(ownerKey, surah, ayah);
  emitChange();
}

/**
 * Returns all records for the current owner that have either a
 * bookmark flag or a note.
 */
export async function listBookmarks(): Promise<BookmarkRecord[]> {
  const ownerKey = currentOwnerKey();
  if (!ownerKey) return [];
  const rows = await getBookmarksForOwner(ownerKey);
  return rows.filter((b) => b.bookmarked || b.note);
}

/**
 * Clears all bookmarks for the current owner locally, and issues a
 * soft-delete sync for each. Rows belonging to other owners on the
 * same device are untouched.
 */
export async function clearBookmarks(): Promise<void> {
  const ownerKey = currentOwnerKey();
  if (!ownerKey) return;
  const mine = await getBookmarksForOwner(ownerKey);
  await clearBookmarksForOwner(ownerKey);
  for (const b of mine) syncBookmarkDelete(ownerKey, b.surah, b.ayah);
  emitChange();
}

/**
 * Nuclear: clear every owner's local records. Used by the "reset
 * progress" setting. No sync writes are issued here — that would
 * require iterating multiple owners and is out of scope for reset.
 */
export async function clearAllLocalBookmarks(): Promise<void> {
  await clearAllBookmarks();
  emitChange();
}

// ─── Legacy migration ─────────────────────────────────────────────────────────

/**
 * One-time migration from the legacy `wise-bookmarks` localStorage
 * array (`{surah, ayah}[]`) to the IDB store, under the **current
 * anonymous device** owner. Safe to call repeatedly; gated by a flag.
 */
interface LegacyBookmarkInput {
  surah: number;
  ayah: number;
  ayahText?: string;
  surahName?: string;
  note?: string;
  bookmarked?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

async function importBookmarkPairs(
  ownerKey: string,
  rows: LegacyBookmarkInput[],
  baseTimestamp: number,
): Promise<boolean> {
  let imported = false;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const surah = Number(row?.surah);
    const ayah = Number(row?.ayah);
    if (!Number.isFinite(surah) || !Number.isFinite(ayah) || surah < 1 || ayah < 1) continue;
    const existing = await getBookmark(ownerKey, surah, ayah);
    if (existing) continue;
    const fallbackTs = baseTimestamp - (rows.length - i);
    const createdAt = Number.isFinite(row.createdAt) ? (row.createdAt as number) : fallbackTs;
    const updatedAt = Number.isFinite(row.updatedAt) ? (row.updatedAt as number) : fallbackTs;
    // Preserve any v6-only content (ayahText, note, …) rather than
    // re-hydrating an empty stub. A row with only a note and no
    // bookmark flag is still a valid record.
    const note = typeof row.note === "string" ? row.note : "";
    const bookmarkedExplicit = typeof row.bookmarked === "boolean" ? row.bookmarked : undefined;
    const bookmarked = bookmarkedExplicit ?? (note ? false : true);
    if (!bookmarked && !note) continue;
    const record: BookmarkRecord = {
      id: bookmarkKey(ownerKey, surah, ayah),
      ownerKey,
      surah,
      ayah,
      ayahText: typeof row.ayahText === "string" ? row.ayahText : "",
      surahName: typeof row.surahName === "string" ? row.surahName : "",
      note,
      bookmarked,
      createdAt,
      updatedAt,
    };
    await putBookmark(record);
    syncBookmarkUpsert(record);
    imported = true;
  }
  return imported;
}

export async function migrateLegacyBookmarks(): Promise<void> {
  try {
    const ownerKey = anonymousOwnerKey();
    if (!ownerKey) return;

    // v6 → v7 IDB-rescued rows (see openDatabase upgrade callback).
    // Consumed once, regardless of the LS-legacy migration flag.
    // Rows are the full v6 shape (surah, ayah, ayahText, note, …) —
    // `importBookmarkPairs` preserves every field it knows about.
    const v6Raw = localStorage.getItem(V6_BOOKMARKS_BACKUP_LS_KEY);
    if (v6Raw) {
      try {
        const parsed = JSON.parse(v6Raw) as unknown;
        if (Array.isArray(parsed)) {
          const imported = await importBookmarkPairs(
            ownerKey,
            parsed as LegacyBookmarkInput[],
            Date.now(),
          );
          if (imported) emitChange();
        }
      } catch {
        /* ignore malformed backup */
      }
      localStorage.removeItem(V6_BOOKMARKS_BACKUP_LS_KEY);
    }

    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        await importBookmarkPairs(ownerKey, parsed as LegacyBookmarkInput[], Date.now());
      }
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
    localStorage.removeItem(LEGACY_KEY);
    emitChange();
  } catch {
    // swallow — migration is best-effort
  }
}

// ─── Remote pull / reconciliation ─────────────────────────────────────────────

interface RemoteBookmarkRow {
  owner_key: string;
  user_id: string | null;
  device_id: string | null;
  surah: number;
  ayah: number;
  ayah_text: string | null;
  surah_name: string | null;
  note: string | null;
  bookmarked: boolean | null;
  created_at: string;
  updated_at: string;
  deleted: boolean | null;
}

async function mergeRemoteRows(ownerKey: string, rows: RemoteBookmarkRow[]): Promise<boolean> {
  let changed = false;
  for (const row of rows) {
    const remoteUpdated = Date.parse(row.updated_at);
    if (!Number.isFinite(remoteUpdated)) continue;
    const existing = await getBookmark(ownerKey, row.surah, row.ayah);
    if (existing && existing.updatedAt >= remoteUpdated) continue;
    if (row.deleted) {
      if (existing) {
        await deleteBookmark(ownerKey, row.surah, row.ayah);
        changed = true;
      }
      continue;
    }
    const bookmarked = row.bookmarked ?? false;
    const note = row.note ?? "";
    if (!bookmarked && !note) {
      if (existing) {
        await deleteBookmark(ownerKey, row.surah, row.ayah);
        changed = true;
      }
      continue;
    }
    const record: BookmarkRecord = {
      id: bookmarkKey(ownerKey, row.surah, row.ayah),
      ownerKey,
      surah: row.surah,
      ayah: row.ayah,
      ayahText: row.ayah_text ?? existing?.ayahText ?? "",
      surahName: row.surah_name ?? existing?.surahName ?? "",
      note,
      bookmarked,
      createdAt: Date.parse(row.created_at) || existing?.createdAt || remoteUpdated,
      updatedAt: remoteUpdated,
    };
    await putBookmark(record);
    changed = true;
  }
  return changed;
}

/**
 * Pull remote bookmarks for the current owner from Supabase and merge
 * into local IDB using LWW on `updated_at`, honoring soft-delete.
 * Best-effort: silently returns when offline, unconfigured, or on error.
 */
export async function pullRemoteBookmarks(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const own = computeOwnership();
  if (!own) return;
  try {
    const { data, error } = await supabase
      .from("device_bookmarks")
      .select(
        "owner_key,user_id,device_id,surah,ayah,ayah_text,surah_name,note,bookmarked,created_at,updated_at,deleted",
      )
      .eq("owner_key", own.ownerKey);
    if (error || !data) return;
    const changed = await mergeRemoteRows(own.ownerKey, data as RemoteBookmarkRow[]);
    if (changed) emitChange();
  } catch {
    // swallow — pull is best-effort
  }
}

/**
 * Invoked when a user signs in on this device. Safely reconciles cloud
 * state for the signed-in user WITHOUT touching records owned by any
 * anonymous (`d:<deviceId>`) or previously-signed-in owner:
 *
 *   1. Pull cloud rows owned by the signed-in user into IDB via LWW.
 *   2. Push any locally-stored user-owned records back to the cloud.
 *
 * Merging of anonymous device bookmarks into the signed-in account is
 * now an explicit, user-confirmed action — see `mergeAnonymousBookmarksIntoUser`
 * and `discardAnonymousClaims`, driven by `listPendingAnonymousClaims`.
 */
export async function claimBookmarksForUser(userId: string): Promise<void> {
  setCurrentUserIdCache(userId);
  if (!isSupabaseConfigured) return;
  const userOwnerKey = `u:${userId}`;

  // Step 1: pull cloud state for the signed-in user.
  await pullRemoteBookmarks();

  // Step 2: push any local user-owned records (e.g. made offline on
  // this device while signed in previously) back to the cloud.
  const userRecords = await getBookmarksForOwner(userOwnerKey);
  for (const record of userRecords) {
    syncBookmarkUpsert(record);
  }
  emitChange();
}

// ─── Anonymous bookmark claim flow ────────────────────────────────────────────

function readResolvedClaims(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(CLAIM_RESOLVED_KEY(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeResolvedClaims(userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(CLAIM_RESOLVED_KEY(userId), JSON.stringify([...ids]));
  } catch {
    // storage full / unavailable — resolutions won't persist, user will
    // be re-prompted on next sign-in; acceptable fallback
  }
}

async function listActiveAnonymousRecords(): Promise<BookmarkRecord[]> {
  const anon = anonymousOwnerKey();
  if (!anon) return [];
  const rows = await getBookmarksForOwner(anon);
  return rows.filter((b) => b.bookmarked || b.note);
}

/**
 * Identity used to record that a user has already decided about a
 * specific anonymous record. Including `updatedAt` means that if the
 * user later deletes and re-creates (or edits) an anonymous bookmark
 * at the same ayah, the new record will *not* be considered already
 * resolved and the claim prompt will appear again.
 */
function claimIdentityFor(rec: BookmarkRecord): string {
  return `${rec.surah}:${rec.ayah}:${rec.updatedAt}`;
}

/**
 * A stable fingerprint for the entire pending claim set — used by the
 * claim dialog to decide whether a "Decide later" dismissal should
 * still suppress the prompt. When a new anonymous bookmark appears,
 * the fingerprint changes and the dialog re-opens.
 */
export function fingerprintPendingClaims(records: BookmarkRecord[]): string {
  return records
    .map(claimIdentityFor)
    .sort()
    .join("|");
}

/**
 * Returns anonymous (device-scoped) bookmarks/notes on this device
 * that the given user has NOT yet decided about. A non-empty result
 * should trigger the "Add to account / Don't add / Decide later"
 * dialog.
 */
export async function listPendingAnonymousClaims(userId: string): Promise<BookmarkRecord[]> {
  const userOwnerKey = `u:${userId}`;
  const anon = anonymousOwnerKey();
  if (!anon || anon === userOwnerKey) return [];
  const resolved = readResolvedClaims(userId);
  const rows = await listActiveAnonymousRecords();
  return rows.filter((r) => !resolved.has(claimIdentityFor(r)));
}

/**
 * Promotes every pending anonymous record into the signed-in user's
 * owner scope (LWW against whatever the user already has) and records
 * each merged identity as resolved so identical records don't
 * re-prompt. Later edits to the same ayah produce a new identity
 * (different updatedAt) and will be offered again.
 * Returns the number of records merged (added or updated).
 */
export async function mergeAnonymousBookmarksIntoUser(userId: string): Promise<number> {
  const userOwnerKey = `u:${userId}`;
  const anon = anonymousOwnerKey();
  if (!anon || anon === userOwnerKey) return 0;

  const pending = await listPendingAnonymousClaims(userId);
  const resolved = readResolvedClaims(userId);
  let merged = 0;
  for (const rec of pending) {
    const existing = await getBookmark(userOwnerKey, rec.surah, rec.ayah);
    if (!existing || existing.updatedAt < rec.updatedAt) {
      const promoted: BookmarkRecord = {
        ...rec,
        id: bookmarkKey(userOwnerKey, rec.surah, rec.ayah),
        ownerKey: userOwnerKey,
      };
      await putBookmark(promoted);
      syncBookmarkUpsert(promoted);
      merged++;
    }
    // Record this exact identity as resolved regardless of LWW outcome
    // — the user has now seen it and made a choice.
    resolved.add(claimIdentityFor(rec));
  }

  writeResolvedClaims(userId, resolved);
  emitChange();
  return merged;
}

/**
 * Records every currently-pending anonymous bookmark identity as
 * resolved WITHOUT copying it into the signed-in account. The
 * underlying anonymous records remain on the device. If the user later
 * edits or recreates a bookmark at the same location, it will produce
 * a new identity and be offered again.
 */
export async function discardAnonymousClaims(userId: string): Promise<void> {
  const pending = await listPendingAnonymousClaims(userId);
  const resolved = readResolvedClaims(userId);
  for (const r of pending) resolved.add(claimIdentityFor(r));
  writeResolvedClaims(userId, resolved);
  emitChange();
}

/**
 * Invoked when a user signs out. Clears the cached user id so
 * subsequent writes are stamped with the anonymous device owner.
 * Local user-owned records remain in IDB but are not visible to the
 * anonymous session (they are keyed under the user owner and not
 * returned by `listBookmarks`).
 */
export function releaseBookmarksForUser(): void {
  setCurrentUserIdCache(null);
  emitChange();
}
