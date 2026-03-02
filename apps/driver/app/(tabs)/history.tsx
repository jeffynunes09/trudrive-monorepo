import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RideDTO } from '../../../../packages/shared-types/src/index'
import { getRidesForDriverId } from '../../utils/api'
import { getStoredUser } from '../../utils/storage'

const STATUS_LABEL: Record<string, string> = {
  searching_driver: 'Buscando motorista',
  driver_assigned: 'Motorista a caminho',
  driver_en_route: 'A caminho',
  in_progress: 'Em andamento',
  payment_pending: 'Aguardando pagamento',
  paid: 'Pago',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

const STATUS_COLOR: Record<string, string> = {
  completed: '#22c55e',
  paid: '#22c55e',
  cancelled: '#ef4444',
  in_progress: '#f59e0b',
  payment_pending: '#a855f7',
}

function RideCard({ ride }: { ride: RideDTO }) {
  const statusLabel = STATUS_LABEL[ride.status] ?? ride.status
  const statusColor = STATUS_COLOR[ride.status] ?? '#6b7280'

  const date = new Date(ride.createdAt)
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.dateText}>{dateStr} • {timeStr}</Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <Ionicons name="radio-button-on-outline" size={14} color="#22c55e" />
          <Text style={styles.addressText} numberOfLines={1}>
            {ride.origin.address ?? `${ride.origin.lat.toFixed(4)}, ${ride.origin.lng.toFixed(4)}`}
          </Text>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Ionicons name="location-outline" size={14} color="#ef4444" />
          <Text style={styles.addressText} numberOfLines={1}>
            {ride.destination.address ?? `${ride.destination.lat.toFixed(4)}, ${ride.destination.lng.toFixed(4)}`}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {ride.distance != null && (
          <Text style={styles.metaText}>{ride.distance.toFixed(1)} km</Text>
        )}
        {ride.duration != null && (
          <Text style={styles.metaText}>{ride.duration} min</Text>
        )}
        {ride.fare != null && (
          <Text style={styles.fareText}>R$ {ride.fare.toFixed(2)}</Text>
        )}
      </View>
    </View>
  )
}

export default function HistoryScreen() {
  const [rides, setRides] = useState<RideDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadRides(silent = false) {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const user = await getStoredUser()
      if (!user?.id) { setError('Usuário não encontrado'); return }
      const data = await getRidesForDriverId(user.id)
      setRides(data)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar histórico')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadRides() }, [])

  function onRefresh() {
    setRefreshing(true)
    loadRides(true)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Histórico de Corridas</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#22c55e" size="large" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Corridas</Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RideCard ride={item} />}
          contentContainerStyle={rides.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={56} color="#2a2a2a" />
              <Text style={styles.emptyTitle}>Nenhuma corrida ainda</Text>
              <Text style={styles.emptyText}>Suas corridas concluídas aparecerão aqui</Text>
            </View>
          }
        />
      )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    marginTop: 80,
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
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: '#555',
    fontSize: 12,
  },
  route: {
    gap: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#333',
    marginLeft: 7,
  },
  addressText: {
    color: '#ccc',
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  metaText: {
    color: '#555',
    fontSize: 12,
  },
  fareText: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 'auto',
  },
})
