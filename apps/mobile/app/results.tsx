import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { validateText, getAyah, type RecitationResult } from '../src/services/api';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string; transcription?: string }>();

  const surahNum = parseInt(params.surah || '1', 10);
  const ayahNum = parseInt(params.ayah || '1', 10);

  const [result, setResult] = useState<RecitationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateRecitation();
  }, []);

  async function validateRecitation() {
    setLoading(true);
    setError(null);

    try {
      // Get the reference text first
      const ayahData = await getAyah(surahNum, ayahNum);

      // Use the transcription from params, or simulate a partial recitation for testing
      const transcription =
        params.transcription ||
        // For testing: use the actual text (should get 100%) or modify it
        ayahData.text;

      const validationResult = await validateText(transcription, {
        surah: surahNum,
        ayah: ayahNum,
        verseKey: `${surahNum}:${ayahNum}`,
      });

      setResult(validationResult);
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate. Is the API running?');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Validating recitation...</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error || 'No results'}</Text>
        <Pressable style={styles.retryButton} onPress={() => router.push('/')}>
          <Text style={styles.retryButtonText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4ECDC4';
    if (score >= 60) return '#F7DC6F';
    return '#FF6B6B';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Overall Score */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Overall Score</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(result.scores.overall) }]}>
          {result.scores.overall}%
        </Text>
        <Text style={styles.verseInfo}>
          Surah {result.verse.surah}, Ayah {result.verse.ayah}
        </Text>
      </View>

      {/* Detailed Scores */}
      <View style={styles.detailsCard}>
        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Accuracy</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${result.scores.accuracy}%`, backgroundColor: getScoreColor(result.scores.accuracy) },
              ]}
            />
          </View>
          <Text style={styles.detailValue}>{result.scores.accuracy}%</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Tajweed</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${result.scores.tajweed}%`, backgroundColor: getScoreColor(result.scores.tajweed) },
              ]}
            />
          </View>
          <Text style={styles.detailValue}>{result.scores.tajweed}%</Text>
        </View>
      </View>

      {/* Transcription */}
      <View style={styles.transcriptionCard}>
        <Text style={styles.sectionTitle}>Transcription</Text>
        <Text style={styles.transcriptionText}>{result.transcription}</Text>
      </View>

      {/* Word Results */}
      {result.words.length > 0 && (
        <View style={styles.wordsCard}>
          <Text style={styles.sectionTitle}>Word by Word</Text>
          <View style={styles.wordsList}>
            {result.words.map((word, i) => (
              <View
                key={i}
                style={[styles.wordChip, word.isCorrect ? styles.wordCorrect : styles.wordIncorrect]}
              >
                <Text style={styles.wordText}>{word.expected}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Violations */}
      {result.violations.length > 0 && (
        <View style={styles.violationsCard}>
          <Text style={styles.sectionTitle}>Areas to Improve</Text>
          {result.violations.map((v, i) => (
            <View key={i} style={styles.violationItem}>
              <View style={[styles.violationDot, v.severity === 'major' ? styles.dotMajor : styles.dotMinor]} />
              <View style={styles.violationContent}>
                <Text style={styles.violationRule}>{v.rule.replace(/_/g, ' ')}</Text>
                <Text style={styles.violationDesc}>{v.expected}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {result.violations.length === 0 && result.scores.overall >= 80 && (
        <View style={styles.successCard}>
          <Text style={styles.successText}>🎉 Excellent recitation!</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.retryButton}
          onPress={() =>
            router.push({
              pathname: '/recite',
              params: { surah: surahNum.toString(), ayah: ayahNum.toString() },
            })
          }
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.homeButton} onPress={() => router.push('/')}>
          <Text style={styles.homeButtonText}>Home</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  verseInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    width: 80,
    fontSize: 14,
    color: '#888',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#2a2a3e',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailValue: {
    width: 45,
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
  },
  transcriptionCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  transcriptionText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 32,
  },
  wordsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  wordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wordCorrect: {
    backgroundColor: '#1a3a2e',
  },
  wordIncorrect: {
    backgroundColor: '#3a1a1a',
  },
  wordText: {
    color: '#fff',
    fontSize: 16,
  },
  violationsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  violationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  violationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  dotMajor: {
    backgroundColor: '#FF6B6B',
  },
  dotMinor: {
    backgroundColor: '#F7DC6F',
  },
  violationContent: {
    flex: 1,
  },
  violationRule: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  violationDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  successCard: {
    backgroundColor: '#1a3a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    color: '#4ECDC4',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
