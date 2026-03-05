import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendPushNotification } from '../modules/notification/notification.service'

describe('sendPushNotification', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  it('não chama fetch se lista de tokens vazia', async () => {
    await sendPushNotification({ pushTokens: [], title: 'T', body: 'B' })

    expect(fetch).not.toHaveBeenCalled()
  })

  it('não chama fetch se nenhum token tem prefixo ExponentPushToken', async () => {
    await sendPushNotification({
      pushTokens: ['invalid-token', 'fcm:abc'],
      title: 'T',
      body: 'B',
    })

    expect(fetch).not.toHaveBeenCalled()
  })

  it('filtra e envia apenas tokens válidos', async () => {
    await sendPushNotification({
      pushTokens: ['ExponentPushToken[valid123]', 'invalid', 'ExponentPushToken[valid456]'],
      title: 'Nova corrida',
      body: 'Corrida disponível',
    })

    expect(fetch).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://exp.host/--/api/v2/push/send')

    const body = JSON.parse(options!.body as string)
    expect(body).toHaveLength(2)
    expect(body[0].to).toBe('ExponentPushToken[valid123]')
    expect(body[1].to).toBe('ExponentPushToken[valid456]')
  })

  it('envia com título, body e data corretos', async () => {
    await sendPushNotification({
      pushTokens: ['ExponentPushToken[abc]'],
      title: 'Título',
      body: 'Mensagem',
      data: { rideId: '123' },
    })

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body[0].title).toBe('Título')
    expect(body[0].body).toBe('Mensagem')
    expect(body[0].data).toEqual({ rideId: '123' })
    expect(body[0].sound).toBe('default')
  })

  it('não propaga erro se fetch falhar', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(
      sendPushNotification({ pushTokens: ['ExponentPushToken[abc]'], title: 'T', body: 'B' })
    ).resolves.not.toThrow()
  })
})
