import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>بِسْمِ اللَّهِ</Text>
      <Text style={styles.subtitle}>Quran Recitation Validator</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Start Practicing</Text>
        <Text style={styles.cardText}>
          Record your recitation and get instant feedback on accuracy and tajweed rules.
        </Text>
        <Link href="/recite" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Begin Recitation</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>--</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    color: '#fff',
    marginTop: 40,
    fontWeight: '300',
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginTop: 8,
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
