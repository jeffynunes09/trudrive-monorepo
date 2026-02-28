import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { getSocket } from '@/utils/socket'

interface IncomingRide {
  rideId: string
  riderId: string
  origin: { lat: number; lng: number; address?: string }
  destination: { lat: number; lng: number; address?: string }
}

export default function DriverHome() {
  const [driverId, setDriverId] = useState('')
  const [joined, setJoined] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [connected, setConnected] = useState(false)
  const [incomingRide, setIncomingRide] = useState<IncomingRide | null>(null)
  const [lastStatus, setLastStatus] = useState<string | null>(null)

  const socket = useRef(getSocket())

  useEffect(() => {
    const s = socket.current

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => {
      setConnected(false)
      setIsOnline(false)
      setJoined(false)
    })
    s.on('RIDE_REQUEST', (ride: IncomingRide) => {
      setIncomingRide(ride)
    })

    s.connect()

    return () => {
      s.off('connect')
      s.off('disconnect')
      s.off('RIDE_REQUEST')
    }
  }, [])

  function handleJoin() {
    if (!driverId.trim()) return Alert.alert('Informe um ID de motorista')
    setJoined(true)
  }

  function handleGoOnline() {
    socket.current.emit('DRIVER_ONLINE', {
      driverId: driverId.trim(),
      // MVP: coordenadas fixas de São Paulo
      lat: -23.5505,
      lng: -46.6333,
    })
    setIsOnline(true)
    setLastStatus(null)
  }

  function handleGoOffline() {
    socket.current.emit('DRIVER_OFFLINE', { driverId: driverId.trim() })
    setIsOnline(false)
  }

  function handleResponse(accepted: boolean) {
    if (!incomingRide) return
    socket.current.emit('RIDE_REQUEST_RESPONSE', {
      rideId: incomingRide.rideId,
      driverId: driverId.trim(),
      accepted,
    })
    setLastStatus(accepted ? 'Corrida aceita! Vá até o passageiro.' : 'Corrida recusada.')
    setIncomingRide(null)
  }

  function formatCoord(value?: string, lat?: number, lng?: number) {
    return value || `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>TruDrive</Text>
          <Text style={styles.subtitle}>Motorista</Text>
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
              value={driverId}
              onChangeText={setDriverId}
              placeholder="Seu ID de motorista"
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
            <Text style={styles.identityText}>
              Motorista: <Text style={styles.identityId}>{driverId}</Text>
            </Text>
          </View>
        )}

        {/* Toggle Online */}
        {joined && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Status de disponibilidade</Text>

            <View style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#dcfce7' : '#f3f4f6' }]}>
              <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22c55e' : '#9ca3af' }]} />
              <Text style={[styles.onlineText, { color: isOnline ? '#15803d' : '#6b7280' }]}>
                {isOnline ? 'Online — aguardando corridas' : 'Offline'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, isOnline ? styles.btnDanger : styles.btnSuccess]}
              onPress={isOnline ? handleGoOffline : handleGoOnline}
            >
              <Text style={styles.btnText}>
                {isOnline ? 'Ficar Offline' : 'Ficar Online'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Último status */}
        {lastStatus && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{lastStatus}</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de corrida recebida */}
      <Modal visible={!!incomingRide} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova corrida!</Text>
              <Text style={styles.modalSubtitle}>Passageiro: {incomingRide?.riderId}</Text>
            </View>

            {incomingRide && (
              <View style={styles.modalBody}>
                <View style={styles.routeRow}>
                  <View style={styles.routeDot} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Origem</Text>
                    <Text style={styles.routeAddress}>
                      {formatCoord(incomingRide.origin.address, incomingRide.origin.lat, incomingRide.origin.lng)}
                    </Text>
                  </View>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, styles.routeDotDest]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel}>Destino</Text>
                    <Text style={styles.routeAddress}>
                      {formatCoord(incomingRide.destination.address, incomingRide.destination.lat, incomingRide.destination.lng)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnDanger]}
                onPress={() => handleResponse(false)}
              >
                <Text style={styles.btnText}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnSuccess]}
                onPress={() => handleResponse(true)}
              >
                <Text style={styles.btnText}>Aceitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  btnSuccess: { backgroundColor: '#16a34a' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  identityBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  identityText: { color: '#15803d', fontSize: 13 },
  identityId: { fontWeight: '700' },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineText: { fontSize: 14, fontWeight: '600' },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  statusText: { fontSize: 14, color: '#1d4ed8', fontWeight: '500' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: { gap: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6b7280' },
  modalBody: { gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
  },
  routeDotDest: { backgroundColor: '#ef4444' },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 5,
  },
  routeInfo: { flex: 1 },
  routeLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  routeAddress: { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 1 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
})
