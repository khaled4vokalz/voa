import type { FastifyPluginAsync } from 'fastify';
import type { RecitationResult } from '@voa/shared/types';
import { validateRecitation } from '../services/validation.js';
import { transcribeBase64Audio, isASRConfigured } from '../services/asr.js';

export const recitationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/recitation/status
   * Check if ASR is configured
   */
  fastify.get('/status', async () => {
    return {
      asrConfigured: isASRConfigured(),
      model: 'tarteel-ai/whisper-base-ar-quran',
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
};
