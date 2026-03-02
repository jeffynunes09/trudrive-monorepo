import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WalletScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balanceValue}>R$ 0,00</Text>
        <Text style={styles.balanceHint}>Seu saldo aparecerá aqui</Text>
      </View>

      <View style={styles.empty}>
        <Ionicons name="wallet-outline" size={56} color="#1f2937" />
        <Text style={styles.emptyTitle}>Nenhuma transação ainda</Text>
        <Text style={styles.emptyText}>Suas transações aparecerão aqui após realizar corridas</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '700',
  },
  balanceCard: {
    margin: 20,
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceValue: {
    color: '#60a5fa',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceHint: {
    color: '#1e3a5f',
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    marginTop: -60,
  },
  emptyTitle: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#1f2937',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
})
