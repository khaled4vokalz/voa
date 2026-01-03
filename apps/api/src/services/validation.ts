import type {
  RecitationResult,
  WordResult,
  TajweedViolation,
  VerseReference,
  TajweedAnnotation,
  TajweedRuleType,
} from '@voa/shared/types';
import { getAyahText, getAyahTajweed } from './quran-data.js';

/**
 * Normalize Arabic text for comparison
 * Removes diacritics (tashkeel) for loose matching
 */
function normalizeArabic(text: string, removeDiacritics = true): string {
  let normalized = text
    .trim()
    // Normalize alef variants
    .replace(/[إأآا]/g, 'ا')
    // Normalize teh marbuta
    .replace(/ة/g, 'ه')
    // Normalize yeh variants
    .replace(/ى/g, 'ي');

  if (removeDiacritics) {
    // Remove Arabic diacritics (harakat)
    normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
  }

  // Remove tatweel (kashida)
  normalized = normalized.replace(/\u0640/g, '');

  return normalized;
}

/**
 * Split Arabic text into words
 */
function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if two words are similar enough (fuzzy match)
 */
function wordsMatch(expected: string, actual: string, threshold = 0.7): boolean {
  const normExpected = normalizeArabic(expected);
  const normActual = normalizeArabic(actual);

  if (normExpected === normActual) return true;

  const maxLen = Math.max(normExpected.length, normActual.length);
  if (maxLen === 0) return true;

  const distance = levenshteinDistance(normExpected, normActual);
  const similarity = 1 - distance / maxLen;

  return similarity >= threshold;
}

/**
 * Compare transcription with reference and get word-level results
 */
function compareWords(referenceText: string, transcription: string): WordResult[] {
  const refWords = splitIntoWords(referenceText);
  const transWords = splitIntoWords(transcription);

  const results: WordResult[] = [];

  // Simple word-by-word comparison
  // TODO: Implement more sophisticated alignment (e.g., dynamic programming)
  for (let i = 0; i < refWords.length; i++) {
    const expected = refWords[i];
    const transcribed = transWords[i] ?? null;
    const isCorrect = transcribed !== null && wordsMatch(expected, transcribed);

    results.push({
      expected,
      transcribed,
      isCorrect,
      position: i + 1,
    });
  }

  return results;
}

/**
 * Detect tajweed violations based on annotations and transcription
 */
function detectViolations(
  referenceText: string,
  transcription: string,
  annotations: TajweedAnnotation[]
): TajweedViolation[] {
  const violations: TajweedViolation[] = [];

  // For now, we assume if a word with tajweed rules is mispronounced,
  // the tajweed rules were likely violated
  const refWords = splitIntoWords(referenceText);
  const transWords = splitIntoWords(transcription);

  // Map character positions to word indices
  let charPos = 0;
  const charToWord: number[] = [];
  for (let wordIdx = 0; wordIdx < refWords.length; wordIdx++) {
    const word = refWords[wordIdx];
    for (let i = 0; i < word.length; i++) {
      charToWord[charPos + i] = wordIdx;
    }
    charPos += word.length + 1; // +1 for space
  }

  // Check each annotation
  for (const annotation of annotations) {
    const wordIdx = charToWord[annotation.start];
    if (wordIdx === undefined) continue;

    const expectedWord = refWords[wordIdx];
    const transcribedWord = transWords[wordIdx];

    // If the word wasn't pronounced correctly, mark as violation
    if (!transcribedWord || !wordsMatch(expectedWord, transcribedWord)) {
      violations.push({
        rule: annotation.rule as TajweedRuleType,
        expected: `Apply ${annotation.rule.replace(/_/g, ' ')}`,
        actual: transcribedWord ? 'Mispronounced' : 'Word missing',
        position: {
          start: annotation.start,
          end: annotation.end,
        },
        severity: 'major',
      });
    }
  }

  return violations;
}

/**
 * Calculate scores based on word results and violations
 */
function calculateScores(
  words: WordResult[],
  violations: TajweedViolation[],
  totalAnnotations: number
): { accuracy: number; tajweed: number; overall: number } {
  // Accuracy: percentage of words correctly pronounced
  const correctWords = words.filter((w) => w.isCorrect).length;
  const accuracy = words.length > 0 ? Math.round((correctWords / words.length) * 100) : 0;

  // Tajweed: percentage of rules not violated
  const tajweed =
    totalAnnotations > 0
      ? Math.round(((totalAnnotations - violations.length) / totalAnnotations) * 100)
      : 100;

  // Overall: weighted average (60% accuracy, 40% tajweed)
  const overall = Math.round(accuracy * 0.6 + tajweed * 0.4);

  return { accuracy, tajweed, overall };
}

/**
 * Validate a recitation against reference
 */
export function validateRecitation(
  verse: VerseReference,
  transcription: string
): RecitationResult {
  // Get reference text
  const referenceText = getAyahText(verse.verseKey);
  if (!referenceText) {
    return {
      verse,
      transcription,
      words: [],
      violations: [],
      scores: { accuracy: 0, tajweed: 0, overall: 0 },
      timestamp: new Date().toISOString(),
    };
  }

  // Get tajweed annotations
  const tajweedData = getAyahTajweed(verse.surah, verse.ayah);
  const annotations = tajweedData?.annotations ?? [];

  // Compare words
  const words = compareWords(referenceText, transcription);

  // Detect violations
  const violations = detectViolations(referenceText, transcription, annotations);

  // Calculate scores
  const scores = calculateScores(words, violations, annotations.length);

  return {
    verse,
    transcription,
    words,
    violations,
    scores,
    timestamp: new Date().toISOString(),
  };
}
