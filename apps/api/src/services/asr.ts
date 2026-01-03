import { HfInference } from '@huggingface/inference';

// Model specifically fine-tuned for Quran recitation (5.75% WER)
const QURAN_WHISPER_MODEL = 'tarteel-ai/whisper-base-ar-quran';

// Fallback to standard Arabic Whisper if needed
const FALLBACK_MODEL = 'openai/whisper-large-v3';

let hfClient: HfInference | null = null;

/**
 * Initialize the Hugging Face client
 */
function getClient(): HfInference {
  if (!hfClient) {
    const token = process.env.HUGGINGFACE_TOKEN;
    if (!token) {
      console.warn('HUGGINGFACE_TOKEN not set. ASR will fail.');
    }
    hfClient = new HfInference(token);
  }
  return hfClient;
}

/**
 * Transcribe audio using Hugging Face Inference API
 *
 * @param audioData - Audio file as Buffer or Blob
 * @param useQuranModel - Use Quran-specialized model (default: true)
 * @returns Transcribed Arabic text
 */
export async function transcribeAudio(
  audioData: Buffer | Blob,
  useQuranModel = true
): Promise<string> {
  const client = getClient();
  const model = useQuranModel ? QURAN_WHISPER_MODEL : FALLBACK_MODEL;

  try {
    const result = await client.automaticSpeechRecognition({
      model,
      data: audioData,
    });

    return result.text;
  } catch (error) {
    console.error('ASR error:', error);

    // If Quran model fails, try fallback
    if (useQuranModel) {
      console.log('Trying fallback model...');
      return transcribeAudio(audioData, false);
    }

    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Transcribe audio from base64 string
 */
export async function transcribeBase64Audio(base64Audio: string): Promise<string> {
  // Remove data URL prefix if present
  const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');

  // Convert base64 to Buffer
  const audioBuffer = Buffer.from(base64Data, 'base64');

  return transcribeAudio(audioBuffer);
}

/**
 * Check if ASR service is configured
 */
export function isASRConfigured(): boolean {
  return !!process.env.HUGGINGFACE_TOKEN;
}
