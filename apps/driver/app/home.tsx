import { useEffect, useRef, useState } from 'react'
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
}

interface ActiveRide {
  rideId: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export default function HomeScreen() {
  const { driverId } = useLocalSearchParams<{ driverId: string }>()
  const mapRef = useRef<MapView>(null)

  const [connected, setConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [incomingRide, setIncomingRide] = useState<IncomingRide | null>(null)
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null)
  const [lastStatus, setLastStatus] = useState<string | null>(null)
  const [locationReady, setLocationReady] = useState(false)

  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline

  const driverIdRef = useRef(driverId)
  driverIdRef.current = driverId

  // GPS watch
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null

    ;(async () => {
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
    })

    socket.on('RIDE_STATUS_UPDATE', ({ status }: { status: string }) => {
      setLastStatus(status)
      if (status === 'completed' || status === 'cancelled') {
        setActiveRide(null)
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
    setLastStatus('driver_assigned')
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

  const polylineCoords: LatLng[] = activeRide && driverLocation
    ? [
        { latitude: driverLocation.lat, longitude: driverLocation.lng },
        { latitude: activeRide.origin.lat, longitude: activeRide.origin.lng },
        { latitude: activeRide.destination.lat, longitude: activeRide.destination.lng },
      ]
    : []

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

        {lastStatus && (
          <View style={styles.statusCard}>
            <Text style={styles.statusCardLabel}>Último status</Text>
            <Text style={styles.statusCardValue}>{lastStatus}</Text>
          </View>
        )}

        {activeRide && (
          <View style={styles.activeRideCard}>
            <Text style={styles.activeRideTitle}>Corrida ativa</Text>
            <Text style={styles.activeRideText} numberOfLines={1}>
              Para: {activeRide.destination.lat.toFixed(4)}, {activeRide.destination.lng.toFixed(4)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.onlineButton, isOnline ? styles.offlineButton : styles.goOnlineButton]}
          onPress={toggleOnline}
          disabled={!locationReady}
        >
          <Text style={styles.onlineButtonText}>
            {isOnline ? 'Ficar Offline' : 'Ficar Online'}
          </Text>
        </TouchableOpacity>
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
  statusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
  },
  statusCardLabel: {
    color: '#666',
    fontSize: 11,
    marginBottom: 2,
  },
  statusCardValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
