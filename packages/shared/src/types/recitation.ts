import type { TajweedViolation } from './tajweed.js';

/**
 * Reference to a specific verse
 */
export interface VerseReference {
  surah: number;
  ayah: number;
  /** Verse key in format "surah:ayah" e.g. "1:1" */
  verseKey: string;
}

/**
 * Word-level comparison result
 */
export interface WordResult {
  /** Expected word from reference */
  expected: string;
  /** What ASR transcribed */
  transcribed: string | null;
  /** Whether it matched */
  isCorrect: boolean;
  /** Position in the ayah (1-indexed) */
  position: number;
}

/**
 * Result of validating a recitation attempt
 */
export interface RecitationResult {
  /** Reference verse info */
  verse: VerseReference;
  /** Raw transcription from ASR */
  transcription: string;
  /** Word-by-word comparison */
  words: WordResult[];
  /** Detected tajweed violations */
  violations: TajweedViolation[];
  /** Scores */
  scores: {
    /** Word accuracy (0-100) */
    accuracy: number;
    /** Tajweed compliance (0-100) */
    tajweed: number;
    /** Weighted overall score (0-100) */
    overall: number;
  };
  /** Processing timestamp */
  timestamp: string;
}

/**
 * Request to validate a recitation
 */
export interface ValidateRecitationRequest {
  /** Audio file as base64 or URL */
  audio: string;
  /** Which verse the user is reciting */
  verse: VerseReference;
}
