import { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, LatLng } from 'react-native-maps'
import * as Location from 'expo-location'
import { useLocalSearchParams } from 'expo-router'
import { getSocket } from '../utils/socket'
import { geocodeAddress, reverseGeocodeLocation } from '../utils/api'
import {
  getToken,
  getStoredUser,
  saveActiveRide,
  getActiveRide,
  clearActiveRide,
} from '../utils/storage'

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

interface RideInfo {
  rideId: string
  distance: number | null
  duration: number | null
  fare: number | null
  otp: string | null
}

interface DriverDetails {
  name: string
  profileImage: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  licensePlate: string | null
}

interface RestoredRide {
  id?: string
  _id?: string
  riderId: string
  driverId?: string
  origin: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  status: string
  otp: string
  otpVerified: boolean
  fare?: number
  distance?: number
  duration?: number
  geometry?: [number, number][]
  driverInfo?: DriverDetails
}

export default function HomeScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId: string }>()
  const mapRef = useRef<MapView>(null)

  const [userId, setUserId] = useState(paramUserId ?? '')
  const [connected, setConnected] = useState(false)
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [origin, setOrigin] = useState('')
  const [originGeocoding, setOriginGeocoding] = useState(false)
  const [destination, setDestination] = useState('')
  const [rideStatus, setRideStatus] = useState<RideStatus | null>(null)
  const [driverInfo, setDriverInfo] = useState<string | null>(null)
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [destCoord, setDestCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [rideInfo, setRideInfo] = useState<RideInfo | null>(null)
  const [routeCoords, setRouteCoords] = useState<LatLng[] | null>(null)
  const [originAddress, setOriginAddress] = useState<string | null>(null)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  const driverFitDone = useRef(false)
  const riderLocationRef = useRef(riderLocation)
  riderLocationRef.current = riderLocation
  const destCoordRef = useRef(destCoord)
  destCoordRef.current = destCoord

  useEffect(() => {
    async function init() {
      if (!paramUserId) {
        const u = await getStoredUser()
        if (u?.id) setUserId(u.id)
      }
      const stored = await getActiveRide()
      if (stored) {
        setRideInfo({
          rideId: stored.rideId,
          distance: stored.distance,
          duration: stored.duration,
          fare: stored.fare,
          otp: stored.otp,
        })
        setRideStatus(stored.status as RideStatus)
        setDestCoord({ lat: stored.destination.lat, lng: stored.destination.lng })
        if (stored.driverId) setDriverInfo(stored.driverId)
        if (stored.geometry && stored.geometry.length > 0) {
          const coords: LatLng[] = stored.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
          setRouteCoords(coords)
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      setRiderLocation({ lat: coords.latitude, lng: coords.longitude })
      setLocationReady(true)

      reverseGeocodeLocation(coords.latitude, coords.longitude)
        .then(addr => {
          if (addr) {
            setOriginAddress(addr)
            setOrigin(addr)
          }
        })
        .catch(() => {})
    })()
  }, [])

  useEffect(() => {
    if (!riderLocation) return
    mapRef.current?.animateToRegion({
      latitude: riderLocation.lat,
      longitude: riderLocation.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800)
  }, [riderLocation])

  async function applyOriginAddress() {
    if (!origin.trim()) return
    setOriginGeocoding(true)
    const geocoded = await geocodeAddress(origin.trim())
    setOriginGeocoding(false)
    if (!geocoded) {
      setGeocodeError('Origem não encontrada. Tente ser mais específico.')
      return
    }
    setRiderLocation({ lat: geocoded.lat, lng: geocoded.lng })
    setOriginAddress(geocoded.address)
    setOrigin(geocoded.address)
    setGeocodeError(null)
    mapRef.current?.animateToRegion({
      latitude: geocoded.lat,
      longitude: geocoded.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 800)
  }

  useEffect(() => {
    const socket = getSocket()

    getToken().then(token => {
      socket.auth = { token: token ?? '' }
      if (!socket.connected) {
        socket.connect()
      } else {
        socket.emit('GET_RIDE_STATE')
      }
    })

    if (socket.connected) setConnected(true)

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('RIDE_RESTORE', (ride: RestoredRide | null) => {
      if (!ride) {
        clearActiveRide()
        setRideInfo(null)
        setRideStatus(null)
        setDestCoord(null)
        setDriverInfo(null)
        setDriverDetails(null)
        setRouteCoords(null)
        return
      }
      const rideId = ride.id ?? (ride as any)._id?.toString() ?? ''
      const otp = !ride.otpVerified ? ride.otp : null

      setRideInfo({ rideId, distance: ride.distance ?? null, duration: ride.duration ?? null, fare: ride.fare ?? null, otp })
      setRideStatus(ride.status as RideStatus)
      setDestCoord({ lat: ride.destination.lat, lng: ride.destination.lng })
      if (ride.driverId) setDriverInfo(ride.driverId)
      if (ride.driverInfo) setDriverDetails(ride.driverInfo)
      if (ride.geometry && ride.geometry.length > 0) {
        const coords: LatLng[] = ride.geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        setRouteCoords(coords)
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
          animated: true,
        })
      }
      saveActiveRide({
        rideId,
        status: ride.status,
        origin: ride.origin,
        destination: ride.destination,
        otp,
        fare: ride.fare ?? null,
        distance: ride.distance ?? null,
        duration: ride.duration ?? null,
        driverId: ride.driverId,
        geometry: ride.geometry,
      })
    })

    socket.on('RIDE_CREATED', ({
      rideId,
      distance,
      duration,
      fare,
      geometry,
    }: {
      rideId: string
      distance: number | null
      duration: number | null
      fare: number | null
      geometry: [number, number][] | null
    }) => {
      setRideInfo({ rideId, distance, duration, fare, otp: null })
      setRideStatus('searching_driver')
      setLoading(false)

      const currentDest = destCoordRef.current
      const currentRider = riderLocationRef.current

      if (currentDest && currentRider) {
        saveActiveRide({
          rideId,
          status: 'searching_driver',
          origin: { lat: currentRider.lat, lng: currentRider.lng, address: originAddress ?? '' },
          destination: { lat: currentDest.lat, lng: currentDest.lng, address: destination },
          otp: null,
          fare,
          distance,
          duration,
          geometry: geometry ?? undefined,
        })
      }

      if (geometry && geometry.length > 0) {
        const coords: LatLng[] = geometry.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        setRouteCoords(coords)
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
          animated: true,
        })
      }
    })

    socket.on('RIDE_STATUS_UPDATE', ({ status, driverId, otp, driverInfo: di }: { rideId: string; status: RideStatus; driverId?: string; otp?: string; driverInfo?: DriverDetails }) => {
      setRideStatus(status)
      if (driverId) setDriverInfo(driverId)
      if (di) setDriverDetails(di)
      if (otp) {
        setRideInfo(prev => prev ? { ...prev, otp } : null)
      }
      if (status === 'in_progress' || status === 'completed' || status === 'cancelled') {
        setRideInfo(prev => prev ? { ...prev, otp: null } : null)
      }
      if (status === 'completed' || status === 'cancelled' || status === 'paid') {
        setLoading(false)
      }
      if (status === 'completed' || status === 'cancelled') {
        clearActiveRide()
      } else {
        setRideInfo(prev => {
          if (prev) {
            saveActiveRide({
              rideId: prev.rideId,
              status,
              origin: { lat: riderLocationRef.current?.lat ?? 0, lng: riderLocationRef.current?.lng ?? 0, address: originAddress ?? '' },
              destination: { lat: destCoord?.lat ?? 0, lng: destCoord?.lng ?? 0, address: destination },
              otp: otp ?? (status === 'in_progress' ? null : prev.otp),
              fare: prev.fare,
              distance: prev.distance,
              duration: prev.duration,
              driverId: driverId ?? undefined,
            })
          }
          return prev
        })
      }
    })

    socket.on('DRIVER_LOCATION_BROADCAST', ({ lat, lng }: { lat: number; lng: number }) => {
      setDriverLocation({ lat, lng })

      const currentRiderLocation = riderLocationRef.current
      if (!driverFitDone.current && currentRiderLocation) {
        driverFitDone.current = true
        mapRef.current?.fitToCoordinates([
          { latitude: currentRiderLocation.lat, longitude: currentRiderLocation.lng },
          { latitude: lat, longitude: lng },
        ], { edgePadding: { top: 80, right: 60, bottom: 280, left: 60 }, animated: true })
      }
    })

    socket.on('RIDE_ERROR', ({ error }: { error: string }) => {
      setLoading(false)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('RIDE_RESTORE')
      socket.off('RIDE_CREATED')
      socket.off('RIDE_STATUS_UPDATE')
      socket.off('DRIVER_LOCATION_BROADCAST')
      socket.off('RIDE_ERROR')
    }
  }, [])

  async function requestRide() {
    if (!riderLocation || !destination.trim()) return

    setGeocodeError(null)
    setRouteCoords(null)
    driverFitDone.current = false
    setLoading(true)
    setDriverLocation(null)
    setDriverInfo(null)
    setRideInfo(null)

    const geocoded = await geocodeAddress(destination.trim())
    if (!geocoded) {
      setGeocodeError('Endereço não encontrado. Tente ser mais específico.')
      setLoading(false)
      return
    }

    setDestCoord({ lat: geocoded.lat, lng: geocoded.lng })

    const socket = getSocket()
    socket.emit('ride:create', {
      riderId: userId,
      origin: {
        lat: riderLocation.lat,
        lng: riderLocation.lng,
        address: originAddress ?? origin ?? 'Localização atual',
      },
      destination: {
        lat: geocoded.lat,
        lng: geocoded.lng,
        address: geocoded.address,
      },
    })
  }

  function resetRide() {
    clearActiveRide()
    setRideStatus(null)
    setDriverInfo(null)
    setDriverDetails(null)
    setDriverLocation(null)
    setDestCoord(null)
    setRideInfo(null)
    setRouteCoords(null)
    setDestination('')
    setLoading(false)
    setGeocodeError(null)
    driverFitDone.current = false
    setOrigin(originAddress ?? '')
  }

  const isRideActive = rideStatus !== null && rideStatus !== 'completed' && rideStatus !== 'cancelled'
  const isRideEnded = rideStatus === 'completed' || rideStatus === 'cancelled' || rideStatus === 'paid'

  const polylineCoords = useMemo<LatLng[]>(() => {
    if (!isRideActive) return []
    if (routeCoords) return routeCoords
    if (riderLocation && destCoord) return [
      { latitude: riderLocation.lat, longitude: riderLocation.lng },
      { latitude: destCoord.lat, longitude: destCoord.lng },
    ]
    return []
  }, [isRideActive, routeCoords, riderLocation, destCoord])

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

        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#2563eb"
            strokeWidth={3}
          />
        )}
      </MapView>

      {!locationReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Obtendo localização...</Text>
        </View>
      )}

      <View style={styles.bottomSheet}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{connected ? 'Conectado' : 'Desconectado'}</Text>
        </View>

        {!isRideActive && !isRideEnded && (
          <>
            <View style={styles.originRow}>
              <TextInput
                style={[styles.input, styles.originInput]}
                placeholder="De onde você sai?"
                placeholderTextColor="#555"
                value={origin}
                onChangeText={setOrigin}
                editable={!loading && !originGeocoding}
                returnKeyType="done"
                onSubmitEditing={applyOriginAddress}
              />
              <TouchableOpacity
                style={[styles.originButton, originGeocoding && styles.requestButtonDisabled]}
                onPress={applyOriginAddress}
                disabled={originGeocoding || !origin.trim()}
              >
                {originGeocoding
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.originButtonText}>OK</Text>
                }
              </TouchableOpacity>
            </View>

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
              disabled={!locationReady || !destination.trim() || !connected || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.requestButtonText}>Pedir Corrida</Text>
              )}
            </TouchableOpacity>
            {geocodeError && (
              <Text style={styles.geocodeErrorText}>{geocodeError}</Text>
            )}
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

            {(rideStatus === 'searching_driver' || rideStatus === 'driver_assigned') && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  if (!rideInfo?.rideId) return
                  const socket = getSocket()
                  socket.emit('CANCEL_RIDE', { rideId: rideInfo.rideId, cancelledBy: 'rider' })
                  resetRide()
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar corrida</Text>
              </TouchableOpacity>
            )}

            {rideInfo && (
              <View style={styles.routeInfoRow}>
                {rideInfo.distance != null && (
                  <View style={styles.routeInfoChip}>
                    <Text style={styles.routeInfoLabel}>Distância</Text>
                    <Text style={styles.routeInfoValue}>{rideInfo.distance.toFixed(1)} km</Text>
                  </View>
                )}
                {rideInfo.duration != null && (
                  <View style={styles.routeInfoChip}>
                    <Text style={styles.routeInfoLabel}>Tempo est.</Text>
                    <Text style={styles.routeInfoValue}>{rideInfo.duration} min</Text>
                  </View>
                )}
                {rideInfo.fare != null && (
                  <View style={[styles.routeInfoChip, styles.fareChip]}>
                    <Text style={styles.routeInfoLabel}>Tarifa</Text>
                    <Text style={styles.fareValue}>
                      R$ {rideInfo.fare.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {rideInfo?.otp && rideStatus === 'driver_assigned' && (
              <View style={styles.otpCard}>
                <Text style={styles.otpCardLabel}>Código de embarque</Text>
                <Text style={styles.otpCardCode}>{rideInfo.otp}</Text>
                <Text style={styles.otpCardHint}>Informe este código ao motorista</Text>
              </View>
            )}

            {driverDetails && (rideStatus === 'driver_assigned' || rideStatus === 'in_progress') && (
              <View style={styles.driverCard}>
                {driverDetails.profileImage ? (
                  <Image source={{ uri: driverDetails.profileImage }} style={styles.driverAvatar} />
                ) : (
                  <View style={styles.driverAvatarPlaceholder}>
                    <Text style={styles.driverAvatarInitial}>
                      {driverDetails.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.driverCardInfo}>
                  <Text style={styles.driverCardName}>{driverDetails.name}</Text>
                  {(driverDetails.vehicleModel || driverDetails.vehicleColor) && (
                    <Text style={styles.driverCardVehicle} numberOfLines={1}>
                      {[driverDetails.vehicleModel, driverDetails.vehicleColor, driverDetails.vehicleYear?.toString()].filter(Boolean).join(' • ')}
                    </Text>
                  )}
                  {driverDetails.licensePlate && (
                    <View style={styles.driverPlateBadge}>
                      <Text style={styles.driverPlateText}>{driverDetails.licensePlate.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
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

            {rideInfo?.fare != null && (
              <View style={styles.finalFareCard}>
                <Text style={styles.finalFareLabel}>Total pago</Text>
                <Text style={styles.finalFareValue}>
                  R$ {rideInfo.fare.toFixed(2).replace('.', ',')}
                </Text>
              </View>
            )}

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
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1e',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: '#aaa', fontSize: 15 },
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#6b7280', fontSize: 13 },
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
  originRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  originInput: {
    flex: 1,
  },
  originButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  requestButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  requestButtonDisabled: { backgroundColor: '#0d1f3c' },
  requestButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  geocodeErrorText: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  rideActiveContainer: { gap: 10 },
  statusBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBadgeText: { fontSize: 14, fontWeight: '600' },
  routeInfoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  routeInfoChip: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
  },
  fareChip: {
    backgroundColor: '#0d1f3c',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  routeInfoLabel: { color: '#6b7280', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  routeInfoValue: { color: '#e5e7eb', fontSize: 14, fontWeight: '700' },
  fareValue: { color: '#60a5fa', fontSize: 15, fontWeight: '800' },
  otpCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 4,
  },
  otpCardLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  otpCardCode: { color: '#60a5fa', fontSize: 36, fontWeight: '800', letterSpacing: 10 },
  otpCardHint: { color: '#4b5563', fontSize: 11 },
  driverCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
  },
  driverAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarInitial: { color: '#60a5fa', fontSize: 20, fontWeight: '700' },
  driverCardInfo: { flex: 1, gap: 2 },
  driverCardName: { color: '#e5e7eb', fontSize: 15, fontWeight: '700' },
  driverCardVehicle: { color: '#9ca3af', fontSize: 12 },
  driverPlateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 2,
  },
  driverPlateText: { color: '#e5e7eb', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  finalFareCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    gap: 4,
  },
  finalFareLabel: { color: '#6b7280', fontSize: 12 },
  finalFareValue: { color: '#60a5fa', fontSize: 28, fontWeight: '800' },
  newRideButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newRideButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
})

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1221' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1221' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111929' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#1b253b' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0e1620' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#091e1d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1adad0' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#091e1d' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#0d1f18' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a5a4a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#131c2e' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#141e32' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#1b253b' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#546070' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#1b253b' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#222d44' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#222d44' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2a3850' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b8c8d8' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#0d1221' }] },
  { featureType: 'road.highway', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#131c2e' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#4a6070' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#1b253b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1b253b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#222d44' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9db8c8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c8dae8' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#7b92a5' }] },
]
