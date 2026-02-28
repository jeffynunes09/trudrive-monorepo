import axios from 'axios'

// OneSignal push notification service
export async function sendPushNotification(params: {
  playerIds: string[]
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  const { playerIds, title, body, data } = params

  await axios.post(
    'https://onesignal.com/api/v1/notifications',
    {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data,
    },
    {
      headers: {
        Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
}
