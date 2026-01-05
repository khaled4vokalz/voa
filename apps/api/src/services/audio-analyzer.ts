/**
 * Audio Analyzer Client
 *
 * Communicates with the Python audio analyzer service
 * for pronunciation quality analysis.
 */

// Python service URL (configurable via environment)
const AUDIO_ANALYZER_URL =
  process.env.AUDIO_ANALYZER_URL || 'http://localhost:8000';

export interface SegmentFeedback {
  start_time: number;
  end_time: number;
  makhraj_score: number;
  timing_score: number;
  overall_score: number;
  issues: string[];
}

export interface PronunciationAnalysis {
  overall_score: number;
  makhraj_score: number;
  timing_score: number;
  fluency_score: number;
  segments: SegmentFeedback[];
  summary: string;
}

/**
 * Check if the audio analyzer service is running
 */
export async function isAudioAnalyzerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${AUDIO_ANALYZER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Analyze pronunciation quality by comparing user audio to reference
 */
export async function analyzePronunciation(
  audioBase64: string,
  surah: number,
  ayah: number,
  qari: string = 'ar.husary'
): Promise<PronunciationAnalysis> {
  const response = await fetch(`${AUDIO_ANALYZER_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_base64: audioBase64,
      surah,
      ayah,
      qari,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Audio analysis failed: ${error}`);
  }

  return response.json() as Promise<PronunciationAnalysis>;
}

/**
 * Check if reference audio is available for a specific ayah
 */
export async function checkReferenceAvailable(
  surah: number,
  ayah: number,
  qari: string = 'ar.husary'
): Promise<boolean> {
  try {
    const response = await fetch(
      `${AUDIO_ANALYZER_URL}/reference/${surah}/${ayah}?qari=${qari}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return false;

    const data = (await response.json()) as { available: boolean };
    return data.available;
  } catch {
    return false;
  }
}
