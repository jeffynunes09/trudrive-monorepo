import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { getRoute } from '../infrastructure/routes/ors.client'
import axios from 'axios'

const origin = { lat: -23.5, lng: -46.6 }
const destination = { lat: -23.6, lng: -46.7 }

describe('getRoute (ORS client)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.OPENAI_ROUTES_SERVICE = 'https://api.openrouteservice.org'
    process.env.ORS_API_KEY = 'test_api_key'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('retorna null se OPENAI_ROUTES_SERVICE não configurado', async () => {
    delete process.env.OPENAI_ROUTES_SERVICE

    const result = await getRoute(origin, destination)
    expect(result).toBeNull()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('retorna null se ORS_API_KEY não configurado', async () => {
    delete process.env.ORS_API_KEY

    const result = await getRoute(origin, destination)
    expect(result).toBeNull()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('retorna RouteResult com dados da API', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        features: [
          {
            properties: {
              summary: { distance: 15000, duration: 1800 }, // 15km, 30min
            },
            geometry: {
              coordinates: [[-46.6, -23.5], [-46.7, -23.6]],
            },
          },
        ],
      },
    })

    const result = await getRoute(origin, destination)

    expect(result).not.toBeNull()
    expect(result!.distance).toBe(15) // 15000m → 15km
    expect(result!.duration).toBe(30) // 1800s → 30min
    expect(result!.geometry).toHaveLength(2)
  })

  it('chama API com parâmetros corretos (start=lng,lat)', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        features: [
          {
            properties: { summary: { distance: 5000, duration: 600 } },
            geometry: { coordinates: [] },
          },
        ],
      },
    })

    await getRoute(origin, destination)

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      expect.objectContaining({
        params: expect.objectContaining({
          api_key: 'test_api_key',
          start: `${origin.lng},${origin.lat}`,
          end: `${destination.lng},${destination.lat}`,
        }),
      })
    )
  })

  it('retorna null se resposta não tem features', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { features: [] } })

    const result = await getRoute(origin, destination)
    expect(result).toBeNull()
  })

  it('retorna null se axios lança erro', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('timeout'))

    const result = await getRoute(origin, destination)
    expect(result).toBeNull()
  })

  it('arredonda distância e duração corretamente', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: {
        features: [
          {
            properties: { summary: { distance: 12345, duration: 754 } },
            geometry: { coordinates: [] },
          },
        ],
      },
    })

    const result = await getRoute(origin, destination)

    expect(result!.distance).toBe(12.35) // 12345/1000 arredondado para 2 casas
    expect(result!.duration).toBe(13)    // 754/60 arredondado
  })
})
