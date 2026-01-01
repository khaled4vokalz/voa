import type { FastifyPluginAsync } from 'fastify';
import type { AyahTajweed } from '@voa/shared/types';

export const quranRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/quran/surah/:surahId
   * Get all ayahs of a surah with tajweed annotations
   */
  fastify.get<{
    Params: { surahId: string };
  }>('/surah/:surahId', async (request) => {
    const surahId = parseInt(request.params.surahId, 10);

    // TODO: Load from tajweed.json and Quran text
    return {
      surah: surahId,
      ayahs: [],
    };
  });

  /**
   * GET /api/quran/ayah/:surahId/:ayahId
   * Get a specific ayah with tajweed annotations
   */
  fastify.get<{
    Params: { surahId: string; ayahId: string };
  }>('/ayah/:surahId/:ayahId', async (request) => {
    const surahId = parseInt(request.params.surahId, 10);
    const ayahId = parseInt(request.params.ayahId, 10);

    // TODO: Load from tajweed.json
    const ayahTajweed: AyahTajweed = {
      surah: surahId,
      ayah: ayahId,
      annotations: [],
    };

    return ayahTajweed;
  });

  /**
   * GET /api/quran/juz/:juzId
   * Get all ayahs of a juz (for Juz Amma = 30)
   */
  fastify.get<{
    Params: { juzId: string };
  }>('/juz/:juzId', async (request) => {
    const juzId = parseInt(request.params.juzId, 10);

    // TODO: Load ayahs for this juz
    return {
      juz: juzId,
      ayahs: [],
    };
  });
};
