import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAyah, type AyahData } from '../src/services/api';

export default function ReciteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();

  // Default to Al-Fatiha 1:1
  const surahNum = parseInt(params.surah || '1', 10);
  const ayahNum = parseInt(params.ayah || '1', 10);

  const [ayahData, setAyahData] = useState<AyahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);

      // TODO: Get actual audio and send to API
      // For now, navigate to results with mock data
      router.push({
        pathname: '/results',
        params: {
          surah: surahNum.toString(),
          ayah: ayahNum.toString(),
        },
      });
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading ayah...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
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
        <Text style={styles.instruction}>
          {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
        </Text>

        <Pressable
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}
          onPress={handleRecord}
        >
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </Pressable>

        {isRecording && (
          <View style={styles.waveform}>
            <Text style={styles.waveformText}>🎙️ Recording...</Text>
          </View>
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
  waveform: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  waveformText: {
    color: '#FF6B6B',
    fontSize: 16,
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
