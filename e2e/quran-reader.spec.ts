import { test, expect } from "@playwright/test";

/**
 * Quran reader happy path.
 *
 * Asserts:
 *  - /surah/1 renders the ayah list (Bismillah glyph or Arabic text
 *    visible) — proves the lazy reader chunk + Uthmanic font + RTL
 *    stack came up cleanly.
 *  - Tapping an ayah (or the surah-level play affordance) invokes
 *    HTMLMediaElement.prototype.play() at least once. This is the
 *    behavioural assertion the user actually cares about: "tap, audio
 *    starts". Without this, a regression that broke the audio-element
 *    bootstrap would silently pass smoke tests.
 */

declare global {
  interface Window {
    __wisePlayCalls?: Array<{ src: string; ts: number }>;
  }
}

test.describe("Quran reader", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__wisePlayCalls = [];
      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function patchedPlay(this: HTMLMediaElement) {
        window.__wisePlayCalls!.push({
          src: this.currentSrc || this.src || "",
          ts: Date.now(),
        });
        return origPlay.apply(this);
      };
    });

    // Stub recitation CDNs so we never depend on the public network.
    await page.route(/mp3quran\.net|quranicaudio\.com|everyayah\.com|qurancentral\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: Buffer.from(SILENT_MP3_BASE64, "base64"),
      });
    });
  });

  test("opens Surah 1 and tap-to-play invokes audio.play()", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/surah/1");

    // Wait for the reader chunk + Bismillah text — proves the route
    // mounted and the Arabic font stack rendered.
    const bismillah = page
      .locator("text=بِسْمِ")
      .or(page.locator("text=﷽"))
      .first();
    await expect(bismillah).toBeVisible({ timeout: 8000 });

    // Find any visible play affordance (ayah-level or surah-level).
    const playButton = page
      .getByRole("button", { name: /play|تشغيل|listen|استمع/i })
      .first();

    if (await playButton.count()) {
      await playButton.click({ force: true }).catch(() => {
        // Click may be intercepted by an onboarding sheet; the
        // audio.play() spy below is the real assertion.
      });
    } else {
      // No explicit play button (some viewports only show ayah-tap-to-
      // play). Click the first ayah text node as a fallback.
      await page
        .locator(".ayah-block, [data-testid^='ayah-'], article")
        .first()
        .click({ force: true })
        .catch(() => {});
    }

    // Wait for the audio manager prime → play sequence to land.
    await page.waitForFunction(
      () => (window.__wisePlayCalls?.length ?? 0) > 0,
      undefined,
      { timeout: 8000 },
    ).catch(() => {});

    const playCalls = await page.evaluate(() => window.__wisePlayCalls ?? []);

    expect(
      playCalls.length,
      `Quran reader never invoked audio.play(). UA pageerrors: ${errors.join(" | ")}`,
    ).toBeGreaterThan(0);

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

const SILENT_MP3_BASE64 =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA";
