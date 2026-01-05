import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface ResultParams {
  surah?: string;
  ayah?: string;
  transcription?: string;
  accuracyScore?: string;
  tajweedScore?: string;
  overallScore?: string;
  hasPronunciation?: string;
  makhrajScore?: string;
  timingScore?: string;
  fluencyScore?: string;
  pronunciationSummary?: string;
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ResultParams>();

  const surahNum = parseInt(params.surah || '1', 10);
  const ayahNum = parseInt(params.ayah || '1', 10);

  // Text-based scores (from ASR transcription comparison)
  const accuracyScore = parseFloat(params.accuracyScore || '0');
  const tajweedScore = parseFloat(params.tajweedScore || '0');
  const textOverallScore = parseFloat(params.overallScore || '0');

  // Pronunciation scores (from audio comparison)
  const hasPronunciation = params.hasPronunciation === 'true';
  const makhrajScore = parseFloat(params.makhrajScore || '0');
  const timingScore = parseFloat(params.timingScore || '0');
  const fluencyScore = parseFloat(params.fluencyScore || '0');
  const pronunciationSummary = params.pronunciationSummary || '';

  // Combined overall score
  const overallScore = hasPronunciation
    ? Math.round((textOverallScore + makhrajScore) / 2)
    : textOverallScore;

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
        <Text style={[styles.scoreValue, { color: getScoreColor(overallScore) }]}>
          {Math.round(overallScore)}%
        </Text>
        <Text style={styles.verseInfo}>
          Surah {surahNum}, Ayah {ayahNum}
        </Text>
      </View>

      {/* Text-Based Scores */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Text Accuracy</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Words</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${accuracyScore}%`, backgroundColor: getScoreColor(accuracyScore) },
              ]}
            />
          </View>
          <Text style={styles.detailValue}>{Math.round(accuracyScore)}%</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Tajweed</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${tajweedScore}%`, backgroundColor: getScoreColor(tajweedScore) },
              ]}
            />
          </View>
          <Text style={styles.detailValue}>{Math.round(tajweedScore)}%</Text>
        </View>
      </View>

      {/* Pronunciation Scores */}
      {hasPronunciation ? (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Pronunciation Quality</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.detailLabel}>Makhraj</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${makhrajScore}%`, backgroundColor: getScoreColor(makhrajScore) },
                ]}
              />
            </View>
            <Text style={styles.detailValue}>{Math.round(makhrajScore)}%</Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.detailLabel}>Timing</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${timingScore}%`, backgroundColor: getScoreColor(timingScore) },
                ]}
              />
            </View>
            <Text style={styles.detailValue}>{Math.round(timingScore)}%</Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.detailLabel}>Fluency</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${fluencyScore}%`, backgroundColor: getScoreColor(fluencyScore) },
                ]}
              />
            </View>
            <Text style={styles.detailValue}>{Math.round(fluencyScore)}%</Text>
          </View>

          {pronunciationSummary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{pronunciationSummary}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Pronunciation Analysis</Text>
          <Text style={styles.infoText}>
            Start the Python audio analyzer service for detailed pronunciation feedback
            (makhraj, timing, fluency).
          </Text>
        </View>
      )}

      {/* Transcription */}
      {params.transcription && (
        <View style={styles.transcriptionCard}>
          <Text style={styles.sectionTitle}>What We Heard</Text>
          <Text style={styles.transcriptionText}>{params.transcription}</Text>
        </View>
      )}

      {/* Feedback */}
      {overallScore >= 80 && (
        <View style={styles.successCard}>
          <Text style={styles.successText}>Excellent recitation!</Text>
        </View>
      )}

      {overallScore < 60 && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tips for Improvement</Text>
          {makhrajScore < 60 && hasPronunciation && (
            <Text style={styles.tipText}>• Focus on articulation points (makhraj)</Text>
          )}
          {timingScore < 60 && hasPronunciation && (
            <Text style={styles.tipText}>• Practice madd elongation timing</Text>
          )}
          {accuracyScore < 60 && (
            <Text style={styles.tipText}>• Review the verse text carefully</Text>
          )}
          <Text style={styles.tipText}>• Recite slowly and clearly</Text>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    width: 70,
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
  summaryBox: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#1a2a3e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
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
  tipCard: {
    backgroundColor: '#2a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 6,
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
