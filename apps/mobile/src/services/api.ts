// API base URL from environment variable
// Set EXPO_PUBLIC_API_URL in .env.local (not committed to git)
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? 'http://localhost:3000' : 'https://your-production-url.com');

interface VerseReference {
  surah: number;
  ayah: number;
  verseKey: string;
}

interface AyahData {
  surah: number;
  ayah: number;
  verseKey: string;
  text: string;
  annotations: Array<{
    rule: string;
    start: number;
    end: number;
  }>;
}

interface RecitationResult {
  verse: VerseReference;
  transcription: string;
  words: Array<{
    expected: string;
    transcribed: string | null;
    isCorrect: boolean;
    position: number;
  }>;
  violations: Array<{
    rule: string;
    expected: string;
    actual: string;
    severity: 'minor' | 'major';
  }>;
  scores: {
    accuracy: number;
    tajweed: number;
    overall: number;
  };
  timestamp: string;
}

interface SegmentFeedback {
  start_time: number;
  end_time: number;
  makhraj_score: number;
  timing_score: number;
  overall_score: number;
  issues: string[];
}

interface WordFeedback {
  word_index: number;
  text: string;  // Arabic word text
  start_time: number;
  end_time: number;
  makhraj_score: number;
  timing_score: number;
  overall_score: number;
  issues: string[];
}

interface PronunciationAnalysis {
  overall_score: number;
  makhraj_score: number;
  timing_score: number;
  fluency_score: number;
  segments: SegmentFeedback[];
  words: WordFeedback[];  // Word-by-word feedback
  summary: string;
}

interface FullValidationResult {
  transcription: RecitationResult;
  pronunciation: PronunciationAnalysis | null;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if ASR is configured
 */
export async function getASRStatus(): Promise<{ asrConfigured: boolean; model: string }> {
  const res = await fetch(`${API_BASE_URL}/api/recitation/status`);
  return res.json();
}

/**
 * Get ayah data with tajweed annotations
 */
export async function getAyah(surah: number, ayah: number): Promise<AyahData> {
  const res = await fetch(`${API_BASE_URL}/api/quran/ayah/${surah}/${ayah}`);
  return res.json();
}

/**
 * Get all ayahs for a surah
 */
export async function getSurah(surahNumber: number): Promise<{
  surah: number;
  totalAyahs: number;
  ayahs: AyahData[];
}> {
  const res = await fetch(`${API_BASE_URL}/api/quran/surah/${surahNumber}`);
  return res.json();
}

/**
 * Validate recitation with audio
 */
export async function validateRecitation(
  audioBase64: string,
  verse: VerseReference
): Promise<RecitationResult> {
  const res = await fetch(`${API_BASE_URL}/api/recitation/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: audioBase64,
      verse,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Validation failed');
  }

  return res.json();
}

/**
 * Validate with text directly (for testing)
 */
export async function validateText(
  transcription: string,
  verse: VerseReference
): Promise<RecitationResult> {
  const res = await fetch(`${API_BASE_URL}/api/recitation/validate-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcription,
      verse,
    }),
  });

  return res.json();
}

/**
 * Full validation with pronunciation analysis
 * Combines ASR transcription, text validation, and audio comparison
 */
export async function fullValidateRecitation(
  audioBase64: string,
  verse: VerseReference,
  qari: string = 'ar.husary'
): Promise<FullValidationResult> {
  const res = await fetch(`${API_BASE_URL}/api/recitation/full-validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio: audioBase64,
      verse,
      qari,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Validation failed');
  }

  return res.json();
}

export { API_BASE_URL };
export type { VerseReference, AyahData, RecitationResult, PronunciationAnalysis, FullValidationResult };
