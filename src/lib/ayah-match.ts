const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;
const ARABIC_TATWEEL = /\u0640/g;
const EXTRA_WHITESPACE = /\s+/g;

const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671\u0627]/g;
const WAW_VARIANTS = /[\u0624\u0648]/g;
const YA_VARIANTS = /[\u0626\u0649\u064A]/g;
const TA_MARBUTA = /\u0629/g;
const HA = /\u0647/g;
const HAMZA_STANDALONE = /[\u0621]/g;
const NUN_TANWIN = /[\u0646\u064C\u064D\u064E\u064B\u064F\u0650]/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_TATWEEL, "")
    .replace(ALEF_VARIANTS, "\u0627")
    .replace(WAW_VARIANTS, "\u0648")
    .replace(YA_VARIANTS, "\u064A")
    .replace(TA_MARBUTA, "\u0647")
    .replace(HA, "\u0647")
    .replace(HAMZA_STANDALONE, "\u0627")
    .replace(NUN_TANWIN, "\u0646")
    .replace(EXTRA_WHITESPACE, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeArabic(text).split(" ").filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen > 20) {
    return a === b ? 0 : maxLen;
  }

  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }

  return dp[b.length];
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = editDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

export function scoreAyahMatch(expected: string, spoken: string): number {
  const expectedTokens = tokenize(expected);
  const spokenTokens = tokenize(spoken);

  if (expectedTokens.length === 0) return 100;
  if (spokenTokens.length === 0) return 0;

  let totalScore = 0;
  const usedSpoken = new Set<number>();

  for (const expToken of expectedTokens) {
    let bestSim = 0;
    let bestIdx = -1;

    for (let si = 0; si < spokenTokens.length; si++) {
      if (usedSpoken.has(si)) continue;
      const sim = wordSimilarity(expToken, spokenTokens[si]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = si;
      }
    }

    if (bestIdx !== -1 && bestSim >= 0.6) {
      totalScore += bestSim;
      usedSpoken.add(bestIdx);
    }
  }

  return Math.round((totalScore / expectedTokens.length) * 100);
}

export interface AyahScoreResult {
  ayahScore: number;
  isCorrect: boolean;
}

export type StrictnessLevel = "lenient" | "normal" | "strict";

const STRICTNESS_THRESHOLD: Record<StrictnessLevel, number> = {
  lenient: 50,
  normal: 65,
  strict: 80,
};

export function scoreAyah(expectedText: string, spokenText: string, strictness: StrictnessLevel = "normal"): AyahScoreResult {
  const ayahScore = scoreAyahMatch(expectedText, spokenText);
  return {
    ayahScore,
    isCorrect: ayahScore >= STRICTNESS_THRESHOLD[strictness],
  };
}

export function scoreRangeRecitation(
  ayahs: { text: string; numberInSurah: number }[],
  spokenTranscript: string,
  strictness: StrictnessLevel = "normal"
): {
  overallScore: number;
  correctAyahs: number;
  perAyah: { numberInSurah: number; score: number; isCorrect: boolean }[];
} {
  if (ayahs.length === 0 || !spokenTranscript.trim()) {
    return { overallScore: 0, correctAyahs: 0, perAyah: [] };
  }

  const normalizedSpoken = normalizeArabic(spokenTranscript);
  const spokenWords = normalizedSpoken.split(" ").filter(Boolean);

  const ayahWordCounts = ayahs.map((a) => tokenize(a.text).length);
  const totalExpectedWords = ayahWordCounts.reduce((s, c) => s + c, 0);

  const spokenTotal = spokenWords.length;
  const ratio = totalExpectedWords > 0 ? spokenTotal / totalExpectedWords : 1;

  const perAyah: { numberInSurah: number; score: number; isCorrect: boolean }[] = [];
  let correctAyahs = 0;
  let wordOffset = 0;

  for (let i = 0; i < ayahs.length; i++) {
    const ayah = ayahs[i];
    const ayahWordCount = ayahWordCounts[i];

    const allocatedWords = Math.ceil(ayahWordCount * ratio);
    const overlap = Math.ceil(allocatedWords * 0.25);

    const sliceStart = Math.max(0, wordOffset - overlap);
    const sliceEnd = Math.min(spokenWords.length, wordOffset + allocatedWords + overlap);

    const ayahSpokenSlice = spokenWords.slice(sliceStart, sliceEnd).join(" ");

    const { ayahScore, isCorrect } = scoreAyah(ayah.text, ayahSpokenSlice, strictness);
    perAyah.push({ numberInSurah: ayah.numberInSurah, score: ayahScore, isCorrect });
    if (isCorrect) correctAyahs++;

    wordOffset += allocatedWords;
  }

  const overallScore = Math.round(
    perAyah.reduce((sum, a) => sum + a.score, 0) / perAyah.length
  );

  return { overallScore, correctAyahs, perAyah };
}
