import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { getSocket } from '@/utils/socket'

type RideStatus =
  | 'searching_driver'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

const STATUS_LABEL: Record<RideStatus, string> = {
  searching_driver: 'Buscando motorista...',
  driver_assigned: 'Motorista encontrado!',
  driver_en_route: 'Motorista a caminho',
  in_progress: 'Em viagem',
  completed: 'Corrida finalizada',
  cancelled: 'Corrida cancelada',
}

const STATUS_COLOR: Record<RideStatus, string> = {
  searching_driver: '#f59e0b',
  driver_assigned: '#3b82f6',
  driver_en_route: '#8b5cf6',
  in_progress: '#22c55e',
  completed: '#6b7280',
  cancelled: '#ef4444',
}

export default function RiderHome() {
  const [userId, setUserId] = useState('')
  const [joined, setJoined] = useState(false)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null)
  const [driverInfo, setDriverInfo] = useState<string | null>(null)

  const socket = useRef(getSocket())

  useEffect(() => {
    const s = socket.current

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => {
      setConnected(false)
      setJoined(false)
    })
    s.on('RIDE_STATUS_UPDATE', ({ status, driverId }: { status: RideStatus; driverId?: string }) => {
      setRideStatus(status)
      setLoading(false)
      if (driverId) setDriverInfo(driverId)
    })

    s.connect()

    return () => {
      s.off('connect')
      s.off('disconnect')
      s.off('RIDE_STATUS_UPDATE')
    }
  }, [])

  function handleJoin() {
    if (!userId.trim()) return Alert.alert('Informe um ID de usuário')
    socket.current.emit('USER_ONLINE', { userId: userId.trim() })
    setJoined(true)
  }

  function handleRequestRide() {
    if (!joined) return Alert.alert('Entre no sistema primeiro')
    if (!origin.trim() || !destination.trim()) return Alert.alert('Preencha origem e destino')

    setLoading(true)
    setRideStatus('searching_driver')
    setDriverInfo(null)

    socket.current.emit(
      'ride:create',
      {
        riderId: userId.trim(),
        origin: { lat: -23.5505, lng: -46.6333, address: origin.trim() },
        destination: { lat: -23.5605, lng: -46.6533, address: destination.trim() },
      },
      (res: { data?: any; error?: string }) => {
        if (res.error) {
          setLoading(false)
          setRideStatus(null)
          Alert.alert('Erro ao criar corrida', res.error)
        }
      }
    )
  }

  function handleReset() {
    setRideStatus(null)
    setDriverInfo(null)
    setOrigin('')
    setDestination('')
    setLoading(false)
  }

  const isActive = rideStatus !== null && rideStatus !== 'completed' && rideStatus !== 'cancelled'

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TruDrive</Text>
          <Text style={styles.subtitle}>Passageiro</Text>
          <View style={styles.connectionRow}>
            <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.connectionText}>{connected ? 'Conectado' : 'Sem conexão'}</Text>
          </View>
        </View>

        {/* Identificação */}
        {!joined ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identificação</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Seu ID de usuário"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={[styles.btn, !connected && styles.btnDisabled]}
              onPress={handleJoin}
              disabled={!connected}
            >
              <Text style={styles.btnText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.identityBadge}>
            <Text style={styles.identityText}>Conectado como: <Text style={styles.identityId}>{userId}</Text></Text>
          </View>
        )}

        {/* Formulário de corrida */}
        {joined && !isActive && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nova corrida</Text>
            <Text style={styles.inputLabel}>Origem</Text>
            <TextInput
              style={styles.input}
              value={origin}
              onChangeText={setOrigin}
              placeholder="De onde você está?"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputLabel}>Destino</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="Para onde vai?"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleRequestRide}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Pedir Corrida</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Status da corrida */}
        {rideStatus && (
          <View style={[styles.statusCard, { borderColor: STATUS_COLOR[rideStatus] }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[rideStatus] }]} />
            <View style={styles.statusContent}>
              <Text style={[styles.statusLabel, { color: STATUS_COLOR[rideStatus] }]}>
                {STATUS_LABEL[rideStatus]}
              </Text>
              {driverInfo && (
                <Text style={styles.statusDetail}>Motorista: {driverInfo}</Text>
              )}
            </View>
            {!isActive && (
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.resetText}>Nova corrida</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 20, gap: 16 },
  header: { alignItems: 'center', paddingVertical: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 12, color: '#6b7280' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  inputLabel: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: -4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  btn: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  identityBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  identityText: { color: '#1d4ed8', fontSize: 13 },
  identityId: { fontWeight: '700' },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusContent: { flex: 1 },
  statusLabel: { fontSize: 15, fontWeight: '700' },
  statusDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  resetText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
})
