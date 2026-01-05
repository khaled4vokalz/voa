import type { FastifyPluginAsync } from 'fastify';
import type { RecitationResult } from '@voa/shared/types';
import { validateRecitation } from '../services/validation.js';
import { transcribeBase64Audio, isASRConfigured } from '../services/asr.js';
import {
  analyzePronunciation,
  isAudioAnalyzerAvailable,
  type PronunciationAnalysis,
} from '../services/audio-analyzer.js';

export const recitationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/recitation/status
   * Check if ASR and audio analyzer are configured
   */
  fastify.get('/status', async () => {
    const audioAnalyzerAvailable = await isAudioAnalyzerAvailable();
    return {
      asrConfigured: isASRConfigured(),
      audioAnalyzerAvailable,
      model: 'openai/whisper-large-v3',
    };
  });

  /**
   * POST /api/recitation/validate
   * Validate a user's Quran recitation from audio
   *
   * Body:
   * - audio: base64 encoded audio data
   * - verse: { surah, ayah, verseKey }
   */
  fastify.post<{
    Body: {
      audio: string;
      verse: { surah: number; ayah: number; verseKey: string };
    };
    Reply: RecitationResult | { error: string };
  }>('/validate', async (request, reply) => {
    const { audio, verse } = request.body;

    if (!isASRConfigured()) {
      reply.status(503);
      return {
        error: 'ASR not configured. Set HUGGINGFACE_TOKEN environment variable.',
      };
    }

    try {
      // Transcribe audio using Whisper
      const transcription = await transcribeBase64Audio(audio);

      // Validate against reference
      const result = validateRecitation(verse, transcription);
      return result;
    } catch (error) {
      console.error('Validation error:', error);
      reply.status(500);
      return {
        error: 'Failed to process audio. Please try again.',
      };
    }
  });

  /**
   * POST /api/recitation/transcribe
   * Just transcribe audio without validation (for testing)
   */
  fastify.post<{
    Body: { audio: string };
    Reply: { transcription: string } | { error: string };
  }>('/transcribe', async (request, reply) => {
    const { audio } = request.body;

    if (!isASRConfigured()) {
      reply.status(503);
      return {
        error: 'ASR not configured. Set HUGGINGFACE_TOKEN environment variable.',
      };
    }

    try {
      const transcription = await transcribeBase64Audio(audio);
      return { transcription };
    } catch (error) {
      console.error('Transcription error:', error);
      reply.status(500);
      return { error: 'Failed to transcribe audio.' };
    }
  });

  /**
   * POST /api/recitation/validate-text
   * Validate transcription directly (for testing without ASR)
   */
  fastify.post<{
    Body: {
      transcription: string;
      verse: { surah: number; ayah: number; verseKey: string };
    };
    Reply: RecitationResult;
  }>('/validate-text', async (request) => {
    const { transcription, verse } = request.body;
    const result = validateRecitation(verse, transcription);
    return result;
  });

  /**
   * POST /api/recitation/analyze-pronunciation
   * Analyze pronunciation quality by comparing audio to reference Qari
   *
   * This uses the Python audio analyzer service to compare:
   * - MFCC features (makhraj/articulation)
   * - Timing (madd duration)
   * - Fluency (hesitation, smoothness)
   */
  fastify.post<{
    Body: {
      audio: string;
      surah: number;
      ayah: number;
      qari?: string;
    };
    Reply: PronunciationAnalysis | { error: string };
  }>('/analyze-pronunciation', async (request, reply) => {
    const { audio, surah, ayah, qari = 'ar.husary' } = request.body;

    // Check if audio analyzer is available
    const available = await isAudioAnalyzerAvailable();
    if (!available) {
      reply.status(503);
      return {
        error:
          'Audio analyzer service not available. Start the Python service with: cd apps/audio-analyzer && python main.py',
      };
    }

    try {
      const analysis = await analyzePronunciation(audio, surah, ayah, qari);
      return analysis;
    } catch (error) {
      console.error('Pronunciation analysis error:', error);
      reply.status(500);
      return {
        error: 'Failed to analyze pronunciation. Please try again.',
      };
    }
  });

  /**
   * POST /api/recitation/full-validate
   * Complete validation: transcription + text comparison + pronunciation analysis
   *
   * Combines ASR transcription, text validation, and audio analysis
   * for comprehensive feedback.
   */
  fastify.post<{
    Body: {
      audio: string;
      verse: { surah: number; ayah: number; verseKey: string };
      qari?: string;
    };
    Reply:
      | {
          transcription: RecitationResult;
          pronunciation: PronunciationAnalysis | null;
        }
      | { error: string };
  }>('/full-validate', async (request, reply) => {
    const { audio, verse, qari = 'ar.husary' } = request.body;

    if (!isASRConfigured()) {
      reply.status(503);
      return {
        error: 'ASR not configured. Set HUGGINGFACE_TOKEN environment variable.',
      };
    }

    try {
      // Step 1: Transcribe audio
      const transcriptionText = await transcribeBase64Audio(audio);

      // Step 2: Validate transcription against reference text
      const transcriptionResult = validateRecitation(verse, transcriptionText);

      // Step 3: Pronunciation analysis (optional, if service is available)
      let pronunciationResult: PronunciationAnalysis | null = null;
      const analyzerAvailable = await isAudioAnalyzerAvailable();

      if (analyzerAvailable) {
        try {
          pronunciationResult = await analyzePronunciation(
            audio,
            verse.surah,
            verse.ayah,
            qari
          );
        } catch (err) {
          console.warn('Pronunciation analysis failed:', err);
          // Continue without pronunciation analysis
        }
      }

      return {
        transcription: transcriptionResult,
        pronunciation: pronunciationResult,
      };
    } catch (error) {
      console.error('Full validation error:', error);
      reply.status(500);
      return {
        error: 'Failed to process audio. Please try again.',
      };
    }
  });
};
