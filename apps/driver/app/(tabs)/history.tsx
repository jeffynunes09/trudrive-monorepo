import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Corridas</Text>
      </View>

      <View style={styles.empty}>
        <Ionicons name="time-outline" size={56} color="#2a2a2a" />
        <Text style={styles.emptyTitle}>Nenhuma corrida ainda</Text>
        <Text style={styles.emptyText}>Suas corridas concluídas aparecerão aqui</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
})
