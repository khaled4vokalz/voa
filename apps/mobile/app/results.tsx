import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function ResultsScreen() {
  const router = useRouter();

  // Mock data - will be replaced with actual API response
  const mockResult = {
    scores: {
      accuracy: 85,
      tajweed: 72,
      overall: 78,
    },
    violations: [
      { rule: 'madd_6', description: 'Madd Laazim not held for 6 counts' },
      { rule: 'ghunnah', description: 'Ghunnah too short' },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Overall Score */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Overall Score</Text>
        <Text style={styles.scoreValue}>{mockResult.scores.overall}%</Text>
      </View>

      {/* Detailed Scores */}
      <View style={styles.detailsCard}>
        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Accuracy</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${mockResult.scores.accuracy}%` }]} />
          </View>
          <Text style={styles.detailValue}>{mockResult.scores.accuracy}%</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.detailLabel}>Tajweed</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                styles.progressTajweed,
                { width: `${mockResult.scores.tajweed}%` },
              ]}
            />
          </View>
          <Text style={styles.detailValue}>{mockResult.scores.tajweed}%</Text>
        </View>
      </View>

      {/* Violations */}
      <View style={styles.violationsCard}>
        <Text style={styles.sectionTitle}>Areas to Improve</Text>
        {mockResult.violations.map((v, i) => (
          <View key={i} style={styles.violationItem}>
            <View style={styles.violationDot} />
            <View>
              <Text style={styles.violationRule}>{v.rule.replace(/_/g, ' ')}</Text>
              <Text style={styles.violationDesc}>{v.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.retryButton} onPress={() => router.push('/recite')}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.homeButton} onPress={() => router.push('/')}>
          <Text style={styles.homeText}>Home</Text>
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
    color: '#4ECDC4',
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
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressTajweed: {
    backgroundColor: '#FF6B6B',
  },
  detailValue: {
    width: 45,
    fontSize: 14,
    color: '#fff',
    textAlign: 'right',
  },
  violationsCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
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
    backgroundColor: '#FF6B6B',
    marginTop: 6,
    marginRight: 12,
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
  retryText: {
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
  homeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
