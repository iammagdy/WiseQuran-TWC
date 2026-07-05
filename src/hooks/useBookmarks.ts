import { useCallback, useEffect, useState } from "react";
import {
  listBookmarks,
  migrateLegacyBookmarks,
  pullRemoteBookmarks,
  removeBookmark,
  subscribeToBookmarkChanges,
  toggleBookmarkFlag,
  upsertBookmark,
  type BookmarkRecord,
  type UpsertBookmarkInput,
} from "@/lib/bookmarks";

let migrationStarted = false;
let pullStarted = false;

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const all = await listBookmarks();
      all.sort((a, b) => b.updatedAt - a.updatedAt);
      setBookmarks(all);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!migrationStarted) {
        migrationStarted = true;
        await migrateLegacyBookmarks();
      }
      if (!cancelled) await refresh();
      // Pull remote state once per session, then refresh to reflect merges.
      if (!pullStarted) {
        pullStarted = true;
        try {
          await pullRemoteBookmarks();
        } catch {
          // ignore — pull is best-effort
        }
        if (!cancelled) await refresh();
      }
    };
    void init();
    const unsub = subscribeToBookmarkChanges(() => {
      void refresh();
    });
    const onOnline = () => {
      void (async () => {
        try {
          await pullRemoteBookmarks();
        } catch {
          // ignore
        }
      })();
    };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  const isBookmarked = useCallback(
    (surah: number, ayah: number) =>
      bookmarks.some(
        (b) => b.surah === surah && b.ayah === ayah && b.bookmarked,
      ),
    [bookmarks],
  );

  const getBookmarkFor = useCallback(
    (surah: number, ayah: number) =>
      bookmarks.find((b) => b.surah === surah && b.ayah === ayah),
    [bookmarks],
  );

  const getNoteFor = useCallback(
    (surah: number, ayah: number) => getBookmarkFor(surah, ayah)?.note ?? "",
    [getBookmarkFor],
  );

  const addBookmark = useCallback(async (input: UpsertBookmarkInput) => {
    await upsertBookmark({ ...input, bookmarked: true });
  }, []);

  // Toggle only the bookmark flag. Any note on the ayah is preserved.
  const toggleBookmark = useCallback(
    async (input: UpsertBookmarkInput) => {
      await toggleBookmarkFlag(input);
    },
    [],
  );

  // Save a note without implicitly bookmarking the ayah.
  const saveNote = useCallback(
    async (input: UpsertBookmarkInput & { note: string }) => {
      await upsertBookmark(input);
    },
    [],
  );

  // Clear the note text. Record is pruned automatically if no bookmark remains.
  const deleteNote = useCallback(
    async (surah: number, ayah: number) => {
      await upsertBookmark({ surah, ayah, note: "" });
    },
    [],
  );

  const remove = useCallback(async (surah: number, ayah: number) => {
    await removeBookmark(surah, ayah);
  }, []);

  return {
    bookmarks,
    loaded,
    isBookmarked,
    getBookmarkFor,
    getNoteFor,
    addBookmark,
    toggleBookmark,
    saveNote,
    deleteNote,
    remove,
    refresh,
  };
}
