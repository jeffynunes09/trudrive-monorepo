import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps'
import * as Location from 'expo-location'
import { useLocalSearchParams } from 'expo-router'
import { getSocket } from '../utils/socket'

interface IncomingRide {
  rideId: string
  origin: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  geometry?: [number, number][]
  distance?: number
  duration?: number
  fare?: number
}

interface ActiveRide {
  rideId: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

type RidePhase = 'driver_assigned' | 'in_progress' | 'payment_pending' | 'paid' | 'completed' | 'cancelled' | null

export default function HomeScreen() {
  const { driverId } = useLocalSearchParams<{ driverId: string }>()
  const mapRef = useRef<MapView>(null)

  const [connected, setConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [incomingRide, setIncomingRide] = useState<IncomingRide | null>(null)
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null)
  const [ridePhase, setRidePhase] = useState<RidePhase>(null)
  const [routeCoords, setRouteCoords] = useState<LatLng[] | null>(null)
  const [locationReady, setLocationReady] = useState(false)

  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline

  const driverIdRef = useRef(driverId)
  driverIdRef.current = driverId

  // GPS watch
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null

      ; (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          ({ coords }) => {
            const loc = { lat: coords.latitude, lng: coords.longitude }
            setDriverLocation(loc)
            setLocationReady(true)

            if (isOnlineRef.current) {
              const socket = getSocket()
              socket.emit('DRIVER_LOCATION_UPDATE', {
                driverId: driverIdRef.current,
                lat: coords.latitude,
                lng: coords.longitude,
              })
            }
          }
        )
      })()

    return () => {
      subscription?.remove()
    }
  }, [])

  // Socket events
  useEffect(() => {
    const socket = getSocket()

    socket.connect()
    if (socket.connected) setConnected(true)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('RIDE_REQUEST', (ride: IncomingRide) => {
      setIncomingRide(ride)
      if (ride.geometry && ride.geometry.length > 0) {
        const coords: LatLng[] = ride.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        setRouteCoords(coords)
      }
    })

    socket.on('RIDE_STATUS_UPDATE', ({ status }: { status: RidePhase }) => {
      setRidePhase(status)
      if (status === 'completed' || status === 'cancelled') {
        setActiveRide(null)
        setRouteCoords(null)
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('RIDE_REQUEST')
      socket.off('RIDE_STATUS_UPDATE')
    }
  }, [])

  // Fit map when incoming ride arrives
  useEffect(() => {
    if (!incomingRide || !driverLocation) return
    const coords: LatLng[] = [
      { latitude: driverLocation.lat, longitude: driverLocation.lng },
      { latitude: incomingRide.origin.lat, longitude: incomingRide.origin.lng },
      { latitude: incomingRide.destination.lat, longitude: incomingRide.destination.lng },
    ]
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 300, left: 60 },
      animated: true,
    })
  }, [incomingRide])

  function toggleOnline() {
    const socket = getSocket()
    if (!isOnline) {
      if (!driverLocation) return
      socket.emit('DRIVER_ONLINE', {
        driverId,
        lat: driverLocation.lat,
        lng: driverLocation.lng,
      })
      setIsOnline(true)
    } else {
      socket.emit('DRIVER_OFFLINE', { driverId })
      setIsOnline(false)
    }
  }

  function handleAccept() {
    if (!incomingRide) return
    const socket = getSocket()
    socket.emit('RIDE_REQUEST_RESPONSE', {
      rideId: incomingRide.rideId,
      driverId,
      accepted: true,
    })
    setActiveRide({
      rideId: incomingRide.rideId,
      origin: incomingRide.origin,
      destination: incomingRide.destination,
    })
    setIncomingRide(null)
    setRidePhase('driver_assigned')
  }

  function handleReject() {
    if (!incomingRide) return
    const socket = getSocket()
    socket.emit('RIDE_REQUEST_RESPONSE', {
      rideId: incomingRide.rideId,
      driverId,
      accepted: false,
    })
    setIncomingRide(null)
  }

  function handleStartRide() {
    if (!activeRide) return
    const socket = getSocket()
    socket.emit('RIDE_START', {
      rideId: activeRide.rideId,
      driverId,
    })
    setRidePhase('in_progress')
  }

  function handlePayment() {
    if (!activeRide) return
    const socket = getSocket()
    socket.emit('RIDE_PAYMENT_REQUEST', {
      rideId: activeRide.rideId,
      driverId,
    })
    setRidePhase('payment_pending')
  }

  // Usa rota real do ORS se disponível, senão linha reta como fallback
  // useMemo evita nova referência de array a cada render causado por GPS (3s)
  const polylineCoords = useMemo<LatLng[]>(() => {
    if (!activeRide) return []
    return routeCoords ?? [
      { latitude: activeRide.origin.lat, longitude: activeRide.origin.lng },
      { latitude: activeRide.destination.lat, longitude: activeRide.destination.lng },
    ]
  }, [activeRide, routeCoords])

  const initialRegion = driverLocation
    ? {
      latitude: driverLocation.lat,
      longitude: driverLocation.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }
    : {
      latitude: -23.55,
      longitude: -46.63,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Você"
            pinColor="#22c55e"
          />
        )}

        {activeRide && (
          <>
            <Marker
              coordinate={{ latitude: activeRide.origin.lat, longitude: activeRide.origin.lng }}
              title="Origem"
              pinColor="#3b82f6"
            />
            <Marker
              coordinate={{ latitude: activeRide.destination.lat, longitude: activeRide.destination.lng }}
              title="Destino"
              pinColor="#ef4444"
            />
          </>
        )}

        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#22c55e"
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Loading overlay */}
      {!locationReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Obtendo localização...</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{connected ? 'Conectado' : 'Desconectado'}</Text>
          <View style={styles.spacer} />
          <View style={[styles.onlineBadge, { backgroundColor: isOnline ? '#14532d' : '#1a1a1a' }]}>
            <Text style={[styles.onlineBadgeText, { color: isOnline ? '#22c55e' : '#666' }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {activeRide && (
          <View style={styles.activeRideCard}>
            <Text style={styles.activeRideTitle}>Corrida ativa</Text>
            <Text style={styles.activeRideText} numberOfLines={1}>
              Para: {activeRide.destination.lat.toFixed(4)}, {activeRide.destination.lng.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Ride flow action buttons */}
        {activeRide && ridePhase === 'driver_assigned' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartRide}>
            <Text style={styles.actionButtonText}>Iniciar Corrida</Text>
          </TouchableOpacity>
        )}

        {activeRide && ridePhase === 'in_progress' && (
          <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
            <Text style={styles.actionButtonText}>Emitir Pagamento</Text>
          </TouchableOpacity>
        )}

        {activeRide && (ridePhase === 'payment_pending' || ridePhase === 'paid') && (
          <View style={styles.processingCard}>
            <ActivityIndicator size="small" color="#8b5cf6" />
            <Text style={styles.processingText}>
              {ridePhase === 'payment_pending' ? 'Processando pagamento...' : 'Pagamento confirmado!'}
            </Text>
          </View>
        )}

        {!activeRide && (
          <TouchableOpacity
            style={[styles.onlineButton, isOnline ? styles.offlineButton : styles.goOnlineButton]}
            onPress={toggleOnline}
            disabled={!locationReady}
          >
            <Text style={styles.onlineButtonText}>
              {isOnline ? 'Ficar Offline' : 'Ficar Online'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Incoming ride modal */}
      <Modal
        visible={incomingRide !== null}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Nova corrida!</Text>

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Origem</Text>
              <Text style={styles.modalValue}>{incomingRide?.origin.address}</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Destino</Text>
              <Text style={styles.modalValue}>{incomingRide?.destination.address}</Text>
            </View>

            {/* Detalhes da rota */}
            {(incomingRide?.distance || incomingRide?.duration || incomingRide?.fare) && (
              <View style={styles.routeChips}>
                {incomingRide.distance != null && (
                  <View style={styles.routeChip}>
                    <Text style={styles.routeChipLabel}>Distância</Text>
                    <Text style={styles.routeChipValue}>{incomingRide.distance.toFixed(1)} km</Text>
                  </View>
                )}
                {incomingRide.duration != null && (
                  <View style={styles.routeChip}>
                    <Text style={styles.routeChipLabel}>Tempo</Text>
                    <Text style={styles.routeChipValue}>{incomingRide.duration} min</Text>
                  </View>
                )}
                {incomingRide.fare != null && (
                  <View style={[styles.routeChip, styles.fareChip]}>
                    <Text style={styles.routeChipLabel}>Tarifa</Text>
                    <Text style={styles.fareChipValue}>
                      R$ {incomingRide.fare.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                <Text style={styles.rejectButtonText}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                <Text style={styles.acceptButtonText}>Aceitar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 15,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#aaa',
    fontSize: 13,
  },
  spacer: {
    flex: 1,
  },
  onlineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeRideCard: {
    backgroundColor: '#0d2a1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#166534',
  },
  activeRideTitle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeRideText: {
    color: '#aaa',
    fontSize: 13,
  },
  startButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  paymentButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a0d2e',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#4c1d95',
  },
  processingText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '500',
  },
  onlineButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  goOnlineButton: {
    backgroundColor: '#22c55e',
  },
  offlineButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  onlineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalInfoRow: {
    gap: 4,
  },
  modalLabel: {
    color: '#666',
    fontSize: 12,
  },
  modalValue: {
    color: '#e5e5e5',
    fontSize: 15,
    fontWeight: '500',
  },
  routeChips: {
    flexDirection: 'row',
    gap: 8,
  },
  routeChip: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  fareChip: {
    backgroundColor: '#0d2a1a',
    borderWidth: 1,
    borderColor: '#166534',
  },
  routeChipLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeChipValue: {
    color: '#e5e5e5',
    fontSize: 13,
    fontWeight: '700',
  },
  fareChipValue: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#2a0a0a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
// Dark map style based on JnDrive design system tokens
// --background #0d1221 | --card #141e32 | --muted #1b253b | --border #222d44
// --primary #1adad0 | --muted-foreground #7b92a5 | --foreground #edf2f7
const mapStyle = [
  // Base geometry — background principal
  { elementType: 'geometry', stylers: [{ color: '#0d1221' }] },
  // Labels gerais
  { elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1221' }] },
  // Ícones de labels
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Landscape
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111929' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#1b253b' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0e1620' }] },

  // Água — teal escuro, label teal
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#091e1d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1adad0' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#091e1d' }] },

  // Parques / vegetação
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#0d1f18' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a4a' }] },
  // Outros POI — ocultos para mapa limpo
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#131c2e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },

  // Estradas — local
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#141e32' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#1b253b' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#546070' }] },

  // Estradas — arterial
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#1b253b' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#222d44' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },

  // Estradas — rodovias
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#222d44' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2a3850' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b8c8d8' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#0d1221' }] },
  // Remover ícone de rodovias
  { featureType: 'road.highway', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Transporte
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#131c2e' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#4a6070' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#1b253b' }] },

  // Divisões administrativas
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1b253b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#222d44' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9db8c8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c8dae8' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },
]
