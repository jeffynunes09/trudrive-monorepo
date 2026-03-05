import axios from 'axios'

export interface GeocodeResult {
  lat: number
  lng: number
  address: string
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

/**
 * Forward geocoding: endereço em texto → coordenadas
 * Usa Nominatim (OpenStreetMap) — gratuito, sem API key, ótimo para Brasil
 */
export async function forwardGeocode(text: string): Promise<GeocodeResult | null> {
  try {
    const query = text.toLowerCase().includes('brasil') ? text.toLowerCase() : `${text}, Brasil`
    const response = await axios.get(`${NOMINATIM}/search`, {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'TruDrive/1.0' },
      timeout: 8000,
    })

    const place = response.data?.[0]
    if (!place) {
      console.warn('[Geocode] forward: nenhum resultado para:', text)
      return null
    }

    console.log('[Geocode] forward resultado:', place.display_name)
    return {
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      address: place.display_name,
    }
  } catch (err: any) {
    console.warn(`[Geocode] forward failed: ${err.message}`)
    return null
  }
}

/**
 * Reverse geocoding: coordenadas → endereço em texto
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await axios.get(`${NOMINATIM}/reverse`, {
      params: { lat, lon: lng, format: 'json' },
      headers: { 'User-Agent': 'TruDrive/1.0' },
      timeout: 8000,
    })

    const address = response.data?.display_name
    if (!address) return null

    console.log('[Geocode] reverse resultado:', address)
    return address as string
  } catch (err: any) {
    console.warn(`[Geocode] reverse failed: ${err.message}`)
    return null
  }
}
