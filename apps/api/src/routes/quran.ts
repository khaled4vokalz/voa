import type { FastifyPluginAsync } from 'fastify';
import {
  getAyahText,
  getAyahTajweed,
  getSurahData,
  getJuzAmmaData,
  getSurahAyahCount,
} from '../services/quran-data.js';

export const quranRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/quran/surah/:surahId
   * Get all ayahs of a surah with tajweed annotations
   */
  fastify.get<{
    Params: { surahId: string };
  }>('/surah/:surahId', async (request) => {
    const surahId = parseInt(request.params.surahId, 10);

    if (surahId < 1 || surahId > 114) {
      return { error: 'Invalid surah number. Must be between 1 and 114.' };
    }

    const ayahs = getSurahData(surahId);
    return {
      surah: surahId,
      totalAyahs: ayahs.length,
      ayahs,
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

    const text = getAyahText(`${surahId}:${ayahId}`);
    if (!text) {
      return { error: 'Ayah not found' };
    }

    const tajweed = getAyahTajweed(surahId, ayahId);

    return {
      surah: surahId,
      ayah: ayahId,
      verseKey: `${surahId}:${ayahId}`,
      text,
      annotations: tajweed?.annotations ?? [],
    };
  });

  /**
   * GET /api/quran/juz/:juzId
   * Get all ayahs of a juz (for Juz Amma = 30)
   */
  fastify.get<{
    Params: { juzId: string };
  }>('/juz/:juzId', async (request) => {
    const juzId = parseInt(request.params.juzId, 10);

    // For now, only Juz 30 (Amma) is supported
    if (juzId !== 30) {
      return {
        error: 'Currently only Juz 30 (Amma) is supported',
        supportedJuz: [30],
      };
    }

    const surahs = getJuzAmmaData();
    return {
      juz: juzId,
      name: "Juz' Amma",
      surahs,
    };
  });

  /**
   * GET /api/quran/surah/:surahId/count
   * Get ayah count for a surah
   */
  fastify.get<{
    Params: { surahId: string };
  }>('/surah/:surahId/count', async (request) => {
    const surahId = parseInt(request.params.surahId, 10);
    const count = getSurahAyahCount(surahId);

    return {
      surah: surahId,
      ayahCount: count,
    };
  });
};
