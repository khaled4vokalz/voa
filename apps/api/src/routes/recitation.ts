import type { FastifyPluginAsync } from 'fastify';
import type { RecitationResult, ValidateRecitationRequest } from '@voa/shared/types';
import { validateRecitation } from '../services/validation.js';

export const recitationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/recitation/validate
   * Validate a user's Quran recitation
   *
   * For now, accepts transcription directly.
   * ASR integration will be added to convert audio -> transcription.
   */
  fastify.post<{
    Body: ValidateRecitationRequest;
    Reply: RecitationResult;
  }>('/validate', async (request) => {
    const { audio, verse } = request.body;

    // TODO: Send audio to Whisper ASR to get transcription
    // For now, we'll accept a transcription in the audio field for testing
    const transcription = audio; // Temporary: treat audio as transcription

    const result = validateRecitation(verse, transcription);
    return result;
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
