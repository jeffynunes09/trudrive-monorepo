import { Socket } from 'socket.io'
import { UserService } from '../../../modules/user/user.service'
import { SocketEvents } from 'shared-events'

const userService = new UserService()

type Ack = (res: { data?: any; error?: string }) => void

export function registerUserHandlers(socket: Socket): void {
  socket.on(SocketEvents.USER_ONLINE, ({ userId }: { userId: string }) => {
    socket.data.userId = userId
    socket.join(`user:${userId}`)
    console.log(`[WS] User ${userId} joined room`)
  })

  socket.on(SocketEvents.USER_CREATE, async (payload:any, ack: Ack) => {
    try {
      const user = await userService.create(payload)
      ack({ data: user })
    } catch (err: any) {
      const isDuplicate = err.code === 11000
      ack({ error: isDuplicate ? 'Phone already registered' : err.message })
    }
  })

  socket.on(SocketEvents.USER_FIND_ALL, async (payload:any, ack: Ack) => {
    try {
      const users = await userService.findAll(payload ?? {})
      ack({ data: users })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.USER_FIND_BY_ID, async ( id:string , ack: Ack) => {
    try {
      const user = await userService.findById(id)
      if (!user) return ack({ error: 'User not found' })
      ack({ data: user })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.USER_UPDATE, async (payload:any, ack: Ack) => {
    try {
      const user = await userService.update(payload.id, payload.data)
      if (!user) return ack({ error: 'User not found' })
      ack({ data: user })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })

  socket.on(SocketEvents.USER_DELETE, async (id:string , ack: Ack) => {
    try {
      const user = await userService.delete(id)
      if (!user) return ack({ error: 'User not found' })
      ack({ data: { deleted: true } })
    } catch (err: any) {
      ack({ error: err.message })
    }
  })
}
