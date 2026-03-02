import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps'
import * as Location from 'expo-location'
import { useLocalSearchParams } from 'expo-router'
import { getSocket } from '../utils/socket'

type RideStatus = 'searching_driver' | 'driver_assigned' | 'in_progress' | 'payment_pending' | 'paid' | 'completed' | 'cancelled'

const STATUS_LABELS: Record<RideStatus, string> = {
  searching_driver: 'Procurando motorista...',
  driver_assigned: 'Motorista a caminho',
  in_progress: 'Em viagem',
  payment_pending: 'Processando pagamento...',
  paid: 'Pagamento confirmado!',
  completed: 'Corrida finalizada',
  cancelled: 'Corrida cancelada',
}

const STATUS_COLORS: Record<RideStatus, string> = {
  searching_driver: '#f59e0b',
  driver_assigned: '#3b82f6',
  in_progress: '#22c55e',
  payment_pending: '#8b5cf6',
  paid: '#10b981',
  completed: '#6b7280',
  cancelled: '#ef4444',
}

export default function HomeScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const mapRef = useRef<MapView>(null)

  const [connected, setConnected] = useState(false)
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [destination, setDestination] = useState('')
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null)
  const [driverInfo, setDriverInfo] = useState<string | null>(null)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentRideId, setCurrentRideId] = useState<string | null>(null)
  const [destCoord, setDestCoord] = useState<{ lat: number; lng: number } | null>(null)

  const driverFitDone = useRef(false)

  // Get rider GPS location once
  useEffect(() => {
    ; (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setRiderLocation({ lat: coords.latitude, lng: coords.longitude })
      setLocationReady(true)
    })()
  }, [])

  // Socket events
  useEffect(() => {
    const socket = getSocket()

    socket.connect()
    if (socket.connected) setConnected(true)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('RIDE_STATUS_UPDATE', ({ rideId, status, driverId }: { rideId: string; status: RideStatus; driverId?: string }) => {
      setRideStatus(status)
      if (driverId) setDriverInfo(driverId)
      if (status === 'completed' || status === 'cancelled' || status === 'paid') {
        setLoading(false)
      }
    })

    socket.on('DRIVER_LOCATION_BROADCAST', ({ lat, lng }: { lat: number; lng: number }) => {
      const loc = { lat, lng }
      setDriverLocation(loc)

      if (!driverFitDone.current && riderLocation) {
        driverFitDone.current = true
        const coords: LatLng[] = [
          { latitude: riderLocation.lat, longitude: riderLocation.lng },
          { latitude: lat, longitude: lng },
        ]
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
          animated: true,
        })
      }
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('RIDE_STATUS_UPDATE')
      socket.off('DRIVER_LOCATION_BROADCAST')
    }
  }, [riderLocation])

  function requestRide() {
    if (!riderLocation || !destination.trim()) return

    const dest = {
      lat: riderLocation.lat - 0.01,
      lng: riderLocation.lng - 0.02,
    }
    setDestCoord(dest)
    driverFitDone.current = false
    setLoading(true)
    setDriverLocation(null)
    setDriverInfo(null)

    const socket = getSocket()
    socket.emit(
      'ride:create',
      {
        riderId: userId,
        origin: {
          lat: riderLocation.lat,
          lng: riderLocation.lng,
          address: 'Localização atual',
        },
        destination: {
          lat: dest.lat,
          lng: dest.lng,
          address: destination.trim(),
        },
      },
      (response: { rideId?: string; data?: { _id?: string; id?: string }; error?: string }) => {
        if (response?.error) {
          setLoading(false)
          return
        }
        const rideId = response?.rideId ?? response?.data?._id ?? response?.data?.id
        if (rideId) {
          setCurrentRideId(rideId)
          setRideStatus('searching_driver')
        }

        // Fit map to origin + destination
        const coords: LatLng[] = [
          { latitude: riderLocation.lat, longitude: riderLocation.lng },
          { latitude: dest.lat, longitude: dest.lng },
        ]
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
          animated: true,
        })
      }
    )
  }

  function resetRide() {
    setRideStatus(null)
    setDriverInfo(null)
    setDriverLocation(null)
    setDestCoord(null)
    setCurrentRideId(null)
    setDestination('')
    setLoading(false)
    driverFitDone.current = false
  }

  const isRideActive = rideStatus !== null && rideStatus !== 'completed' && rideStatus !== 'cancelled'
  const isRideEnded = rideStatus === 'completed' || rideStatus === 'cancelled' || rideStatus === 'paid'

  const polylineCoords: LatLng[] =
    riderLocation && destCoord && isRideActive
      ? [
        { latitude: riderLocation.lat, longitude: riderLocation.lng },
        { latitude: destCoord.lat, longitude: destCoord.lng },
      ]
      : []

  const initialRegion = riderLocation
    ? {
      latitude: riderLocation.lat,
      longitude: riderLocation.lng,
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
        {riderLocation && (
          <Marker
            coordinate={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
            title="Você"
            pinColor="#2563eb"
          />
        )}

        {destCoord && (
          <Marker
            coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }}
            title="Destino"
            pinColor="#ef4444"
          />
        )}

        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Motorista"
            pinColor="#f59e0b"
          />
        )}

        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#2563eb"
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Loading overlay for location */}
      {!locationReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Obtendo localização...</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{connected ? 'Conectado' : 'Desconectado'}</Text>
        </View>

        {!isRideActive && !isRideEnded && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Para onde você quer ir?"
              placeholderTextColor="#555"
              value={destination}
              onChangeText={setDestination}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                styles.requestButton,
                (!locationReady || !destination.trim() || !connected || loading) && styles.requestButtonDisabled,
              ]}
              onPress={requestRide}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.requestButtonText}>Pedir Corrida</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {isRideActive && (
          <View style={styles.rideActiveContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[rideStatus!] + '22', borderColor: STATUS_COLORS[rideStatus!] },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[rideStatus!] }]}>
                {STATUS_LABELS[rideStatus!]}
              </Text>
            </View>

            {driverInfo && (
              <View style={styles.driverCard}>
                <Text style={styles.driverCardLabel}>Motorista</Text>
                <Text style={styles.driverCardValue} numberOfLines={1}>{driverInfo}</Text>
              </View>
            )}
          </View>
        )}

        {isRideEnded && (
          <View style={styles.rideActiveContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[rideStatus!] + '22', borderColor: STATUS_COLORS[rideStatus!] },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[rideStatus!] }]}>
                {STATUS_LABELS[rideStatus!]}
              </Text>
            </View>
            <TouchableOpacity style={styles.newRideButton} onPress={resetRide}>
              <Text style={styles.newRideButtonText}>Nova corrida</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1e',
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
    backgroundColor: '#111827',
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
    color: '#6b7280',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  requestButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  requestButtonDisabled: {
    backgroundColor: '#0d1f3c',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rideActiveContainer: {
    gap: 12,
  },
  statusBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  driverCard: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
  },
  driverCardLabel: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 2,
  },
  driverCardValue: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  newRideButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newRideButtonText: {
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
