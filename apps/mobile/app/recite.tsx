import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAyah, fullValidateRecitation, type AyahData } from '../src/services/api';
import { useAudioRecorder } from '../src/hooks/useAudioRecorder';

export default function ReciteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();

  const surahNum = parseInt(params.surah || '1', 10);
  const ayahNum = parseInt(params.ayah || '1', 10);

  const [ayahData, setAyahData] = useState<AyahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorder = useAudioRecorder();

  useEffect(() => {
    loadAyah();
  }, [surahNum, ayahNum]);

  async function loadAyah() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAyah(surahNum, ayahNum);
      setAyahData(data);
    } catch (err) {
      setError('Failed to load ayah. Is the API running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPress() {
    if (recorder.isRecording) {
      // Stop recording and validate
      setValidating(true);
      const audioBase64 = await recorder.stopRecording();

      if (!audioBase64) {
        Alert.alert('Error', 'Failed to capture audio');
        setValidating(false);
        return;
      }

      try {
        const result = await fullValidateRecitation(audioBase64, {
          surah: surahNum,
          ayah: ayahNum,
          verseKey: `${surahNum}:${ayahNum}`,
        });

        // Navigate to results with the full validation data
        router.push({
          pathname: '/results',
          params: {
            surah: surahNum.toString(),
            ayah: ayahNum.toString(),
            transcription: result.transcription.transcription,
            // Pass scores
            accuracyScore: result.transcription.scores.accuracy.toString(),
            tajweedScore: result.transcription.scores.tajweed.toString(),
            overallScore: result.transcription.scores.overall.toString(),
            // Pass pronunciation analysis if available
            hasPronunciation: result.pronunciation ? 'true' : 'false',
            makhrajScore: result.pronunciation?.makhraj_score.toString() || '0',
            timingScore: result.pronunciation?.timing_score.toString() || '0',
            fluencyScore: result.pronunciation?.fluency_score.toString() || '0',
            pronunciationSummary: result.pronunciation?.summary || '',
          },
        });
      } catch (err) {
        console.error('Validation error:', err);
        Alert.alert('Error', 'Failed to validate recording. Please try again.');
      } finally {
        setValidating(false);
      }
    } else {
      // Start recording
      const started = await recorder.startRecording();
      if (!started && recorder.error) {
        Alert.alert('Error', recorder.error);
      }
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading ayah...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadAyah}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Verse Display */}
      <View style={styles.verseContainer}>
        <Text style={styles.verseLabel}>
          Surah {surahNum}, Ayah {ayahNum}
        </Text>
        <Text style={styles.verseText}>{ayahData?.text || ''}</Text>
        <Text style={styles.annotationCount}>
          {ayahData?.annotations.length || 0} tajweed rules
        </Text>
      </View>

      {/* Recording Controls */}
      <View style={styles.controls}>
        {validating ? (
          <>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.instruction}>Validating your recitation...</Text>
          </>
        ) : (
          <>
            <Text style={styles.instruction}>
              {recorder.isPreparing
                ? 'Preparing...'
                : recorder.isRecording
                  ? `Recording ${recorder.formattedDuration}`
                  : 'Tap to start recording'}
            </Text>

            <Pressable
              style={[
                styles.recordButton,
                recorder.isRecording && styles.recordButtonActive,
                recorder.isPreparing && styles.recordButtonDisabled,
              ]}
              onPress={handleRecordPress}
              disabled={recorder.isPreparing || validating}
            >
              <View
                style={[
                  styles.recordInner,
                  recorder.isRecording && styles.recordInnerActive,
                ]}
              />
            </Pressable>

            {recorder.isRecording && (
              <Text style={styles.recordingHint}>Tap again to stop and validate</Text>
            )}
          </>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        {ayahNum > 1 && (
          <Pressable
            style={styles.navButton}
            onPress={() =>
              router.setParams({ surah: surahNum.toString(), ayah: (ayahNum - 1).toString() })
            }
          >
            <Text style={styles.navText}>← Previous</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.navButton}
          onPress={() =>
            router.setParams({ surah: surahNum.toString(), ayah: (ayahNum + 1).toString() })
          }
        >
          <Text style={styles.navText}>Next →</Text>
        </Pressable>
      </View>

      {/* Tips */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>Tips:</Text>
        <Text style={styles.tipsText}>• Recite clearly and at a moderate pace</Text>
        <Text style={styles.tipsText}>• Ensure quiet environment</Text>
        <Text style={styles.tipsText}>• Hold device close to your mouth</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  verseContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  verseLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  verseText: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 48,
  },
  annotationCount: {
    fontSize: 12,
    color: '#4ECDC4',
    marginTop: 12,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 180,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4ECDC4',
  },
  recordButtonActive: {
    borderColor: '#FF6B6B',
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ECDC4',
  },
  recordInnerActive: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    width: 32,
    height: 32,
  },
  recordingHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#FF6B6B',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  navButton: {
    backgroundColor: '#2a2a3e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  navText: {
    color: '#fff',
    fontSize: 14,
  },
  tips: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
});
