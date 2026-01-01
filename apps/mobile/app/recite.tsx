import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function ReciteScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording and navigate to results
      setIsRecording(false);
      router.push('/results');
    } else {
      // Start recording
      setIsRecording(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Verse Display */}
      <View style={styles.verseContainer}>
        <Text style={styles.verseLabel}>Surah Al-Fatiha (1:1)</Text>
        <Text style={styles.verseText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
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

      {/* Instructions */}
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
  verseContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  verseLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  verseText: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 52,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 32,
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
