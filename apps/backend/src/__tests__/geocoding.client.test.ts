import { describe, it, expect, vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { forwardGeocode, reverseGeocode } from '../infrastructure/routes/geocoding.client'
import axios from 'axios'

describe('forwardGeocode', () => {
  it('retorna coordenadas e endereço para texto válido', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: [{ lat: '-23.5505', lon: '-46.6333', display_name: 'São Paulo, Brasil' }],
    })

    const result = await forwardGeocode('São Paulo')

    expect(result).toEqual({
      lat: -23.5505,
      lng: -46.6333,
      address: 'São Paulo, Brasil',
    })
  })

  it('adiciona ", Brasil" ao texto se não contém "brasil"', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: [{ lat: '0', lon: '0', display_name: 'Test' }],
    })

    await forwardGeocode('São Paulo')

    const callParams = vi.mocked(axios.get).mock.calls[0][1]?.params
    expect(callParams.q).toBe('São Paulo, Brasil')
  })

  it('não duplica ", Brasil" se texto já contém "brasil"', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: [{ lat: '0', lon: '0', display_name: 'Test' }],
    })

    await forwardGeocode('Rio de Janeiro, Brasil')

    const callParams = vi.mocked(axios.get).mock.calls[0][1]?.params
    expect(callParams.q).toBe('rio de janeiro, brasil')
  })

  it('retorna null se nenhum resultado encontrado', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [] })

    const result = await forwardGeocode('Endereço Inexistente')
    expect(result).toBeNull()
  })

  it('retorna null se axios lança erro', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('timeout'))

    const result = await forwardGeocode('São Paulo')
    expect(result).toBeNull()
  })

  it('usa limit: 1 na requisição', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: [{ lat: '0', lon: '0', display_name: 'Test' }],
    })

    await forwardGeocode('Curitiba')

    const callParams = vi.mocked(axios.get).mock.calls[0][1]?.params
    expect(callParams.limit).toBe(1)
  })
})

describe('reverseGeocode', () => {
  it('retorna endereço para coordenadas válidas', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { display_name: 'Av. Paulista, São Paulo' },
    })

    const result = await reverseGeocode(-23.5, -46.6)
    expect(result).toBe('Av. Paulista, São Paulo')
  })

  it('passa lat e lon corretamente como parâmetros', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { display_name: 'Test' },
    })

    await reverseGeocode(-23.5505, -46.6333)

    const callParams = vi.mocked(axios.get).mock.calls[0][1]?.params
    expect(callParams.lat).toBe(-23.5505)
    expect(callParams.lon).toBe(-46.6333)
  })

  it('retorna null se display_name ausente', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })

    const result = await reverseGeocode(-23.5, -46.6)
    expect(result).toBeNull()
  })

  it('retorna null se axios lança erro', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('network error'))

    const result = await reverseGeocode(-23.5, -46.6)
    expect(result).toBeNull()
  })
})
