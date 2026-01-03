import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { AyahTajweed, TajweedAnnotation } from '@voa/shared/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');

// Cached data
let tajweedData: AyahTajweed[] | null = null;
let quranText: Map<string, string> | null = null;

/**
 * Load tajweed annotations from JSON
 */
function loadTajweedData(): AyahTajweed[] {
  if (tajweedData) return tajweedData;

  const filePath = join(DATA_DIR, 'tajweed.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Array<{
    surah?: number;
    ayah?: number;
    annotations: TajweedAnnotation[];
  }>;

  // The JSON is an array where index corresponds to ayah number (1-indexed globally)
  // We need to map it to surah/ayah format
  tajweedData = data.map((item, index) => ({
    surah: item.surah ?? 0,
    ayah: item.ayah ?? index + 1,
    annotations: item.annotations,
  }));

  return tajweedData;
}

/**
 * Load Quran text from Tanzil format (surah|ayah|text)
 */
function loadQuranText(): Map<string, string> {
  if (quranText) return quranText;

  const filePath = join(DATA_DIR, 'quran-uthmani.txt');
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');

  quranText = new Map();
  for (const line of lines) {
    const [surah, ayah, text] = line.split('|');
    if (surah && ayah && text) {
      const key = `${surah}:${ayah}`;
      quranText.set(key, text);
    }
  }

  return quranText;
}

/**
 * Get ayah text by verse key (e.g., "1:1")
 */
export function getAyahText(verseKey: string): string | null {
  const text = loadQuranText();
  return text.get(verseKey) ?? null;
}

/**
 * Get ayah text by surah and ayah number
 */
export function getAyahTextByNumber(surah: number, ayah: number): string | null {
  return getAyahText(`${surah}:${ayah}`);
}

/**
 * Get tajweed annotations for a specific ayah
 */
export function getAyahTajweed(surah: number, ayah: number): AyahTajweed | null {
  const data = loadTajweedData();

  // Find the ayah in the data
  const found = data.find((item) => item.surah === surah && item.ayah === ayah);
  return found ?? null;
}

/**
 * Get all ayahs for a surah with text and tajweed
 */
export function getSurahData(surahNumber: number): Array<{
  surah: number;
  ayah: number;
  verseKey: string;
  text: string;
  annotations: TajweedAnnotation[];
}> {
  const text = loadQuranText();
  const tajweed = loadTajweedData();

  const results: Array<{
    surah: number;
    ayah: number;
    verseKey: string;
    text: string;
    annotations: TajweedAnnotation[];
  }> = [];

  // Iterate through all text entries for this surah
  for (const [key, ayahText] of text.entries()) {
    const [s, a] = key.split(':').map(Number);
    if (s === surahNumber) {
      const tajweedInfo = tajweed.find((t) => t.surah === s && t.ayah === a);
      results.push({
        surah: s,
        ayah: a,
        verseKey: key,
        text: ayahText,
        annotations: tajweedInfo?.annotations ?? [],
      });
    }
  }

  // Sort by ayah number
  results.sort((a, b) => a.ayah - b.ayah);
  return results;
}

/**
 * Get Juz 30 (Amma) surahs: 78-114
 */
export function getJuzAmmaData() {
  const surahs: Array<{
    surahNumber: number;
    ayahs: ReturnType<typeof getSurahData>;
  }> = [];

  for (let surah = 78; surah <= 114; surah++) {
    surahs.push({
      surahNumber: surah,
      ayahs: getSurahData(surah),
    });
  }

  return surahs;
}

/**
 * Get total ayah count for a surah
 */
export function getSurahAyahCount(surahNumber: number): number {
  const text = loadQuranText();
  let count = 0;
  for (const key of text.keys()) {
    const [s] = key.split(':').map(Number);
    if (s === surahNumber) count++;
  }
  return count;
}
