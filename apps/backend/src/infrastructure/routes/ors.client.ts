import axios from 'axios'

export interface RouteResult {
  distance: number          // km
  duration: number          // minutes
  geometry: [number, number][]  // [lng, lat] pairs — ORS order
}

/**
 * Fetches a driving route from OpenRouteService via GET.
 * Docs: GET /v2/directions/driving-car?api_key=<key>&start=<lng,lat>&end=<lng,lat>
 *
 * Env vars:
 *   ORS_BASE_URL — base URL  (ex: https://api.openrouteservice.org)
 *   ORS_API_KEY  — API key do ORS
 */
export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResult | null> {
  // Suporta tanto o nome novo (ORS_BASE_URL) quanto o legado (OPENAI_ROUTES_SERVICE)
  const baseUrl = process.env.ORS_BASE_URL ?? process.env.OPENAI_ROUTES_SERVICE
  const apiKey  = process.env.ORS_API_KEY

  if (!baseUrl || !apiKey) {
    console.warn('[ORS] ORS_BASE_URL ou ORS_API_KEY não configurado — rota ignorada')
    return null
  }

  // Remove qualquer path que o usuário tenha incluído no env var — usa só o host
  const { protocol, host } = new URL(baseUrl)
  const url = `${protocol}//${host}/v2/directions/driving-car`
  const start  = `${origin.lng},${origin.lat}`
  const end    = `${destination.lng},${destination.lat}`

  console.log(`[ORS] GET ${url}?start=${start}&end=${end}`)

  try {
    const response = await axios.get(url, {
      params: { api_key: apiKey, start, end },
      headers: { Accept: 'application/geo+json' },
      timeout: 8000,
    })

    const feature = response.data?.features?.[0]
    if (!feature) {
      console.warn('[ORS] Resposta sem features:', JSON.stringify(response.data))
      return null
    }

    const summary = feature.properties?.summary
    const coords: [number, number][] = feature.geometry?.coordinates ?? []

    console.log(`[ORS] Rota calculada: ${(summary.distance / 1000).toFixed(2)}km / ${Math.round(summary.duration / 60)}min`)

    return {
      distance: Math.round((summary.distance / 1000) * 100) / 100,
      duration: Math.round(summary.duration / 60),
      geometry: coords,
    }
  } catch (err: any) {
    const status = err.response?.status
    const body   = JSON.stringify(err.response?.data)
    console.warn(`[ORS] Route fetch failed: ${err.message} | status=${status} | body=${body}`)
    return null
  }
}
