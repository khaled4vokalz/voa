import { HfInference } from '@huggingface/inference';

// Use Whisper large-v3 with replicate provider for best Arabic support
// The tarteel-ai model isn't available on inference providers
const WHISPER_MODEL = 'openai/whisper-large-v3';

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

// Providers to try in order of preference
// Note: replicate doesn't support ASR through HF inference library
const ASR_PROVIDERS = ['hf-inference', 'fal-ai'] as const;

/**
 * Transcribe audio using Hugging Face Inference API
 * Tries multiple providers until one works
 *
 * @param audioData - Audio file as Buffer or Blob
 * @returns Transcribed Arabic text
 */
export async function transcribeAudio(audioData: Buffer | Blob): Promise<string> {
  const client = getClient();
  let lastError: Error | null = null;

  for (const provider of ASR_PROVIDERS) {
    try {
      console.log(`Trying ASR with provider: ${provider}...`);
      const result = await client.automaticSpeechRecognition({
        model: WHISPER_MODEL,
        data: audioData,
        provider,
      });

      console.log(`ASR succeeded with provider: ${provider}`);
      return result.text;
    } catch (error) {
      console.error(`ASR error with ${provider}:`, (error as Error).message);
      lastError = error as Error;
    }
  }

  throw new Error(`Failed to transcribe audio. Last error: ${lastError?.message}`);
}

/**
 * Transcribe audio from base64 string
 * @param base64Audio - Base64 encoded audio data
 * @param mimeType - Audio MIME type (default: audio/m4a for iOS expo-av)
 */
export async function transcribeBase64Audio(
  base64Audio: string,
  mimeType = 'audio/m4a'
): Promise<string> {
  // Remove data URL prefix if present and extract mime type
  const dataUrlMatch = base64Audio.match(/^data:(audio\/[\w+-]+);base64,/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64Audio = base64Audio.replace(/^data:audio\/[\w+-]+;base64,/, '');
  }

  // Convert base64 to Buffer, then to Blob with proper MIME type
  const audioBuffer = Buffer.from(base64Audio, 'base64');
  const audioBlob = new Blob([audioBuffer], { type: mimeType });

  console.log(`Audio blob created: ${audioBlob.size} bytes, type: ${mimeType}`);

  return transcribeAudio(audioBlob);
}

/**
 * Check if ASR service is configured
 */
export function isASRConfigured(): boolean {
  return !!process.env.HUGGINGFACE_TOKEN;
}
