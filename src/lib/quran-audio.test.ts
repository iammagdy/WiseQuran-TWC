import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadSurahAudio } from "./quran-audio";
import * as db from "./db";
import * as reciters from "./reciters";

// Mock dependencies
vi.mock("./db", () => ({
  checkStorageQuota: vi.fn(),
  saveAudio: vi.fn(),
  getAudio: vi.fn(),
  deleteAudio: vi.fn(),
}));

vi.mock("./reciters", () => ({
  getReciterAudioUrls: vi.fn(),
  getReciterAudioUrl: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

describe("downloadSurahAudio", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should handle QuotaExceededError during saveAudio", async () => {
    // 1. Setup mock returns
    const mockStorageCheck = {
      percentUsed: 50,
      hasEnoughSpace: vi.fn().mockReturnValue(true),
    };
    vi.mocked(db.checkStorageQuota).mockResolvedValue(mockStorageCheck as unknown as Awaited<ReturnType<typeof db.checkStorageQuota>>);

    vi.mocked(reciters.getReciterAudioUrls).mockResolvedValue([
      "http://example.com/audio1.mp3",
    ]);

    // Create a mock buffer that looks like valid audio (ID3 header)
    const validAudioHeader = new Uint8Array([0x49, 0x44, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    // Make it large enough to pass MIN_AUDIO_SIZE (10240)
    const mockBuffer = new Uint8Array(10240);
    mockBuffer.set(validAudioHeader);

    // fetchAudioFromUrl is now Blob-based. The validator slices the
    // first 50 bytes off the Blob and reads them as an ArrayBuffer.
    // jsdom's Blob doesn't fully implement `slice().arrayBuffer()`,
    // so we provide a minimal hand-rolled stand-in that mimics what
    // the production code expects from a real Blob.
    const makeBlobLike = (bytes: Uint8Array): Blob => {
      const blob = {
        size: bytes.byteLength,
        type: "audio/mpeg",
        slice(start = 0, end: number = bytes.byteLength) {
          return makeBlobLike(bytes.slice(start, end));
        },
        arrayBuffer: () => Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
      };
      Object.setPrototypeOf(blob, Blob.prototype);
      return blob as unknown as Blob;
    };
    const audioBlob = makeBlobLike(mockBuffer);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "audio/mpeg" }),
      body: undefined,
      blob: () => Promise.resolve(audioBlob),
      arrayBuffer: () => Promise.resolve(mockBuffer.buffer),
    } as unknown as Response);

    // Mock saveAudio to throw QuotaExceededError
    const quotaError = new Error("QuotaExceededError");
    quotaError.name = "QuotaExceededError";
    vi.mocked(db.saveAudio).mockRejectedValue(quotaError);

    // Mock deleteAudio to return a resolved promise since the code chains .catch() on it
    vi.mocked(db.deleteAudio).mockResolvedValue(undefined as unknown as Awaited<ReturnType<typeof db.deleteAudio>>);

    // 2. Execute & Verify
    await expect(downloadSurahAudio("ar.alafasy", 1)).rejects.toThrow(
      "فشل تحميل الصوت من جميع المصادر: تم تجاوز حد التخزين المسموح. يرجى حذف بعض الملفات"
    );

    expect(db.saveAudio).toHaveBeenCalledTimes(1);
    expect(db.deleteAudio).toHaveBeenCalledTimes(1); // Should try to cleanup
  });
});
