/**
 * Seed de simulação automática — fluxo completo de segunda corrida
 *
 * PRÉ-REQUISITOS:
 *   - Backend rodando (pnpm --filter backend dev)
 *   - Redis e MongoDB ativos
 *
 * Uso:
 *   pnpm --filter backend seed
 *
 * O script simula em sequência:
 *   1.  Upsert motorista seed aprovado no banco
 *   2.  Login de motorista + rider 1 + rider 2
 *   3.  Motorista vai online
 *   4.  Rider 1 cria corrida
 *   5.  Motorista recebe RIDE_REQUEST → aceita
 *   6.  Rider 1 recebe OTP → motorista valida
 *   7.  Corrida 1 em andamento
 *   8.  Motorista se move para perto do destino → SECOND_RIDE_AVAILABLE
 *   9.  Rider 2 cria corrida
 *  10.  Motorista recebe RIDE_REQUEST → enfileira (segunda corrida)
 *  11.  Motorista solicita pagamento da corrida 1
 *  12.  Corrida 1 completed → corrida 2 inicia automaticamente
 *  13.  Verifica RIDE_ROUTE_UPDATE chega ao rider 2
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { io as ioClient, Socket } from 'socket.io-client'
import { Ride } from '../modules/ride/ride.schema'
import { User } from '../modules/user/user.schema'

const API_URL   = `http://localhost:${process.env.PORT ?? 3000}`
const MONGO_URI = process.env.MONGODB_URI!

// ─── Dados seed ───────────────────────────────────────────────────────────────

const SEED_DRIVER = {
  name: 'Carlos Seed', email: 'carlos.seed@test.com', password: 'senha123',
  phone: '31900000000', role: 'driver' as const, isApproved: true, isActive: true,
  document: '12345678901', licensePlate: 'ABC1D234',
  vehicleModel: 'Honda Civic', vehicleYear: 2022, vehicleColor: 'Preto',
}

const SEED_RIDERS = [
  { name: 'Ana Seed',   email: 'ana.seed@test.com',   password: 'senha123', phone: '31900000001', role: 'rider' as const },
  { name: 'Bruno Seed', email: 'bruno.seed@test.com',  password: 'senha123', phone: '31900000002', role: 'rider' as const },
]

// Corrida 1: Pampulha / Urca → Av. Otacílio Negrão de Lima
const RIDE1 = {
  origin:      { lat: -19.8720833, lng: -44.0175517, address: 'Rua Ipanema, Urca, Pampulha, BH' },
  destination: { lat: -19.8650000, lng: -44.0120000, address: 'Av. Otacílio Negrão de Lima, BH' },
}

// Corrida 2: origem perto do destino da corrida 1 (< 3km)
const RIDE2 = {
  origin:      { lat: -19.8655000, lng: -44.0130000, address: 'Lagoa da Pampulha, BH' },
  destination: { lat: -19.8580000, lng: -44.0090000, address: 'Mineirão, Pampulha, BH' },
}

// Posição inicial do motorista — perto da origem da corrida 1
const DRIVER_START = { lat: -19.8722, lng: -44.0178 }

// Posição simulada perto do destino da corrida 1 (para acionar SECOND_RIDE_AVAILABLE)
const DRIVER_NEAR_DEST = { lat: RIDE1.destination.lat, lng: RIDE1.destination.lng }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function step(msg: string) { console.log(`\n[STEP] ${msg}`) }
function ok(msg: string)   { console.log(`  ✔  ${msg}`) }

async function httpPost(path: string, body: object): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function loginOrRegister(user: { name: string; email: string; password: string; phone: string; role: string }): Promise<{ token: string; userId: string }> {
  const login = await httpPost('/api/auth/login', { email: user.email, password: user.password })
  if (login.token) {
    ok(`Login: ${user.name} (${login.user.id})`)
    return { token: login.token, userId: login.user.id }
  }
  const reg = await httpPost('/api/auth/register', user)
  if (!reg.token) throw new Error(`Falha ao registrar ${user.email}: ${JSON.stringify(reg)}`)
  ok(`Registrado: ${user.name} (${reg.user.id})`)
  return { token: reg.token, userId: reg.user.id }
}

function connectSocket(token: string): Socket {
  return ioClient(API_URL, { auth: { token } })
}

/** Aguarda um evento específico no socket, com timeout. */
function waitForEvent(socket: Socket, event: string, timeoutMs = 12_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off(event, handler)
      reject(new Error(`Timeout (${timeoutMs}ms) aguardando evento "${event}"`))
    }, timeoutMs)
    function handler(data: any) {
      clearTimeout(t)
      resolve(data)
    }
    socket.once(event, handler)
  })
}

/** Aguarda RIDE_STATUS_UPDATE com status específico. */
function waitForStatus(socket: Socket, targetStatus: string, timeoutMs = 15_000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off('RIDE_STATUS_UPDATE', handler)
      reject(new Error(`Timeout aguardando status "${targetStatus}"`))
    }, timeoutMs)
    function handler(data: any) {
      if (data.status === targetStatus) {
        clearTimeout(t)
        socket.off('RIDE_STATUS_UPDATE', handler)
        resolve(data)
      }
    }
    socket.on('RIDE_STATUS_UPDATE', handler)
  })
}

/** Captura o OTP de qualquer RIDE_STATUS_UPDATE driver_assigned que chegue. */
function captureOtp(socket: Socket, timeoutMs = 12_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off('RIDE_STATUS_UPDATE', handler)
      reject(new Error('Timeout aguardando OTP no RIDE_STATUS_UPDATE'))
    }, timeoutMs)
    function handler(data: any) {
      if (data.status === 'driver_assigned' && data.otp) {
        clearTimeout(t)
        socket.off('RIDE_STATUS_UPDATE', handler)
        resolve(data.otp)
      }
    }
    socket.on('RIDE_STATUS_UPDATE', handler)
  })
}

// ─── Upsert motorista seed ────────────────────────────────────────────────────

async function upsertDriver(): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_DRIVER.password, 10)
  const { password, ...data } = SEED_DRIVER
  await User.findOneAndUpdate({ email: data.email }, { $set: { ...data, passwordHash } }, { upsert: true, new: true })
  ok(`Motorista seed upsertado: ${data.name}`)
}

// ─── Limpeza das corridas ativas dos riders seed ──────────────────────────────

async function cleanRides(): Promise<void> {
  const emails = SEED_RIDERS.map(r => r.email)
  const users  = await User.find({ email: { $in: emails } })
  const ids    = users.map(u => u._id.toString())
  if (ids.length === 0) return
  const { deletedCount } = await Ride.deleteMany({
    riderId: { $in: ids },
    status:  { $in: ['searching_driver', 'driver_assigned', 'in_progress', 'payment_pending'] },
  })
  if (deletedCount > 0) ok(`${deletedCount} corrida(s) ativa(s) anterior(es) removida(s)`)
}

// ─── Simulação principal ──────────────────────────────────────────────────────

async function run() {
  console.log(`\nBackend: ${API_URL}`)

  if (!MONGO_URI) throw new Error('MONGODB_URI não definido no .env')
  await mongoose.connect(MONGO_URI)
  step('Preparando banco de dados...')
  await upsertDriver()
  await cleanRides()
  await mongoose.disconnect()

  // ── Login de todos ────────────────────────────────────────────────────────
  step('Login de motorista + riders...')
  const [driverAuth, rider1Auth, rider2Auth] = await Promise.all([
    loginOrRegister(SEED_DRIVER),
    loginOrRegister(SEED_RIDERS[0]),
    loginOrRegister(SEED_RIDERS[1]),
  ])

  // ── Sockets ───────────────────────────────────────────────────────────────
  const driverSocket = connectSocket(driverAuth.token)
  const rider1Socket = connectSocket(rider1Auth.token)
  const rider2Socket = connectSocket(rider2Auth.token)

  // Aguarda RIDE_RESTORE em todos os sockets antes de enviar qualquer evento.
  // O connection handler do backend é async (faz queries no DB) e só registra
  // os event handlers DEPOIS de emitir RIDE_RESTORE. Enviar eventos antes
  // disso os descarta silenciosamente.
  await Promise.all([
    waitForEvent(driverSocket, 'RIDE_RESTORE', 10_000),
    waitForEvent(rider1Socket, 'RIDE_RESTORE', 10_000),
    waitForEvent(rider2Socket, 'RIDE_RESTORE', 10_000),
  ])
  ok('Todos os sockets prontos (RIDE_RESTORE recebido)')

  // ── Motorista online ──────────────────────────────────────────────────────
  step('Motorista vai online...')
  driverSocket.emit('DRIVER_ONLINE', { driverId: driverAuth.userId, ...DRIVER_START })
  await sleep(300)
  ok(`Motorista online em (${DRIVER_START.lat}, ${DRIVER_START.lng})`)

  // ── Rider 1 cria corrida ──────────────────────────────────────────────────
  step('Rider 1 cria corrida...')
  rider1Socket.emit('USER_ONLINE', { userId: rider1Auth.userId, role: 'rider' })
  rider1Socket.emit('ride:create', { riderId: rider1Auth.userId, ...RIDE1 })
  // ORS pode demorar — timeout generoso
  const ride1Created = await waitForEvent(rider1Socket, 'RIDE_CREATED', 30_000)
  const rideId1 = ride1Created.rideId
  ok(`Corrida 1 criada: ${rideId1}`)
  ok(`  ${RIDE1.origin.address} → ${RIDE1.destination.address}`)

  // ── Motorista recebe e aceita corrida 1 ───────────────────────────────────
  step('Motorista recebe RIDE_REQUEST e aceita...')
  const rideReq1 = await waitForEvent(driverSocket, 'RIDE_REQUEST', 30_000)
  ok(`RIDE_REQUEST recebido: ${rideReq1.rideId} | R$ ${rideReq1.fare?.toFixed(2) ?? '—'}`)

  // OTP só começa a ser aguardado APÓS o RIDE_REQUEST chegar,
  // para não consumir o timeout enquanto ORS ainda processa a rota
  const otpPromise = captureOtp(rider1Socket)

  driverSocket.emit('RIDE_REQUEST_RESPONSE', {
    rideId: rideReq1.rideId,
    driverId: driverAuth.userId,
    accepted: true,
  })

  // ── Rider 1 recebe OTP ────────────────────────────────────────────────────
  step('Aguardando OTP no rider 1...')
  const otp1 = await otpPromise
  ok(`OTP recebido pelo rider 1: ${otp1}`)

  // ── Motorista valida OTP ──────────────────────────────────────────────────
  step('Motorista valida OTP...')
  await sleep(300)
  driverSocket.emit('OTP_VALIDATE', { rideId: rideId1, driverId: driverAuth.userId, otp: otp1 })
  await waitForEvent(driverSocket, 'OTP_VERIFIED')
  ok('OTP verificado — corrida 1 in_progress')

  // ── Motorista se move para perto do destino → SECOND_RIDE_AVAILABLE ────────
  step('Motorista se move para perto do destino (< 3 km)...')
  await sleep(400)
  driverSocket.emit('DRIVER_LOCATION_UPDATE', { driverId: driverAuth.userId, ...DRIVER_NEAR_DEST })
  await waitForEvent(driverSocket, 'SECOND_RIDE_AVAILABLE')
  ok(`SECOND_RIDE_AVAILABLE recebido — motorista a (${DRIVER_NEAR_DEST.lat}, ${DRIVER_NEAR_DEST.lng})`)

  // ── Rider 2 cria corrida ──────────────────────────────────────────────────
  step('Rider 2 cria corrida (segunda corrida)...')
  rider2Socket.emit('USER_ONLINE', { userId: rider2Auth.userId, role: 'rider' })
  await sleep(200)
  rider2Socket.emit('ride:create', { riderId: rider2Auth.userId, ...RIDE2 })
  const ride2Created = await waitForEvent(rider2Socket, 'RIDE_CREATED', 30_000)
  const rideId2 = ride2Created.rideId
  ok(`Corrida 2 criada: ${rideId2}`)
  ok(`  ${RIDE2.origin.address} → ${RIDE2.destination.address}`)

  // ── Motorista recebe e enfileira corrida 2 ────────────────────────────────
  step('Motorista recebe RIDE_REQUEST da segunda corrida e enfileira...')
  const rideReq2 = await waitForEvent(driverSocket, 'RIDE_REQUEST', 30_000)
  ok(`RIDE_REQUEST recebido: ${rideReq2.rideId} | R$ ${rideReq2.fare?.toFixed(2) ?? '—'}`)

  // Listener do rider 2 registrado antes do aceite (sem risco de race condition pois RIDE_REQUEST já chegou)
  const rider2StatusPromise = waitForStatus(rider2Socket, 'driver_assigned')

  driverSocket.emit('RIDE_REQUEST_RESPONSE', {
    rideId: rideReq2.rideId,
    driverId: driverAuth.userId,
    accepted: true,
  })

  const rider2Status = await rider2StatusPromise
  ok(`Rider 2 recebeu driver_assigned | queued=${rider2Status.queued ?? false} | OTP: ${rider2Status.otp}`)

  // ── Motorista solicita pagamento (finaliza corrida 1) ─────────────────────
  step('Motorista finaliza corrida 1 (RIDE_PAYMENT_REQUEST)...')

  // Escuta RIDE_ROUTE_UPDATE no rider 2 para confirmar que chega
  const rider2RoutePromise = waitForEvent(rider2Socket, 'RIDE_ROUTE_UPDATE', 20_000)

  driverSocket.emit('RIDE_PAYMENT_REQUEST', { rideId: rideId1, driverId: driverAuth.userId })

  await waitForStatus(driverSocket, 'completed', 15_000)
  ok('Corrida 1 completed')

  // ── Corrida 2 inicia automaticamente ─────────────────────────────────────
  step('Aguardando corrida 2 iniciar automaticamente...')
  const driverRoute2 = await waitForEvent(driverSocket, 'RIDE_ROUTE_UPDATE', 8_000)
  ok(`Driver recebeu RIDE_ROUTE_UPDATE | phase=${driverRoute2.phase} | rideId=${driverRoute2.rideId}`)

  const rider2Route = await rider2RoutePromise
  ok(`Rider 2 recebeu RIDE_ROUTE_UPDATE | phase=${rider2Route.phase}`)

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  SIMULACAO CONCLUIDA COM SUCESSO')
  console.log('══════════════════════════════════════════════════════')
  console.log(`  Corrida 1 (${rideId1}): completed`)
  console.log(`  Corrida 2 (${rideId2}): driver_assigned → motorista a caminho`)
  console.log('\n  Para continuar manualmente no app do motorista:')
  console.log(`    carlos.seed@test.com / senha123`)
  console.log(`    (corrida 2 ativa: ${RIDE2.origin.address})`)
  console.log(`\n  Rider 2 aguardando OTP: ${rider2Status.otp}`)

  driverSocket.disconnect()
  rider1Socket.disconnect()
  rider2Socket.disconnect()

  process.exit(0)
}

run().catch(err => {
  console.error('\n✖ Simulação falhou:', err.message)
  process.exit(1)
})
