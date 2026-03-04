# TruDrive — Requisitos para MVP 100%

> Auditoria realizada em: 2026-03-04
> Base: leitura completa de todos os módulos do monorepo

---

## Status Geral

O projeto possui uma base sólida com o fluxo principal de corrida **funcionando**. Os blockers para MVP são integrações externas não finalizadas, telas crashando por funções indefinidas, e rotas de admin desprotegidas.

---

## 🔴 CRÍTICO — App crasha / funcionalidade quebrada

### [C1] ~~Funções de geocodificação indefinidas~~ — RESOLVIDO ✅
`geocodeAddress()` e `reverseGeocodeLocation()` estão definidas em `apps/rider/utils/api.ts` (linhas 139-161). Backend possui `GeocodeController` completo usando Nominatim (OpenStreetMap, gratuito, sem API key). Driver app não usa geocoding. **Sem pendência.**

---

### [C2] Tabs de Histórico e Carteira causam crash
**Arquivos:**
- `apps/driver/app/(tabs)/history.tsx` — conteúdo ausente/vazio
- `apps/driver/app/(tabs)/wallet.tsx` — conteúdo ausente/vazio
- `apps/rider/app/(tabs)/history.tsx` — conteúdo ausente/vazio
- `apps/rider/app/(tabs)/wallet.tsx` — conteúdo ausente/vazio
**Problema:** Tabs registradas no layout mas sem implementação real. Navegação crasha.
**Solução:**
- `history.tsx`: listar corridas passadas com status, valor, data e endereços (chamada REST `GET /api/rides?userId=me`)
- `wallet.tsx`: exibir saldo acumulado do motorista + extrato de corridas pagas (MVP pode ser somente leitura)

---

### [C3] Pagamento é simulado (fake delay de 1 segundo)
**Arquivo:** `apps/backend/src/workers/payment.worker.ts` (linha 17)
**Problema:** `// TODO: integrate payment provider` — o pagamento avança automaticamente sem cobrança real.
**Solução:** Integrar Mercado Pago (credenciais já esperadas em `.env`):
1. Criar `POST /api/webhook/payment` para receber confirmação do Mercado Pago
2. No worker, criar preferência de pagamento via SDK do Mercado Pago
3. Retornar link de pagamento ao rider via socket `RIDE_PAYMENT_REQUEST`
4. Confirmar corrida só após webhook de sucesso

---

### [C4] Chave do Google Maps é placeholder
**Arquivos:** `apps/driver/app.json`, `apps/rider/app.json`
**Problema:** `GOOGLE_API_KEY: 'YOUR_API_KEY'` — mapas não renderizam no Android.
**Solução:** Substituir pelo valor real via `EXPO_PUBLIC_GOOGLE_API_KEY` no `.env` e referenciar no `app.config.js`.

---

## 🟠 ALTO — Segurança e funcionalidade core

### [A1] Rotas de admin completamente desprotegidas
**Arquivo:** `apps/backend/src/modules/user/user.routes.ts`, `apps/backend/src/modules/ride/ride.module.ts`
**Problema:** Qualquer pessoa autenticada pode aprovar motoristas, cancelar corridas, desativar usuários. Não há verificação de `role === 'admin'`.
**Solução:** Criar middleware `requireAdmin` e aplicar nas rotas sensíveis:
```typescript
// middleware/requireAdmin.ts
if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
```
Aplicar em: `PATCH /users/:id/approve`, `DELETE /users/:id`, `PATCH /users/:id/deactivate`, `DELETE /rides/:id`.

---

### [A2] Push notifications implementadas mas nunca chamadas
**Arquivo:** `apps/backend/src/modules/notification/notification.service.ts`
**Problema:** `NotificationService` existe com integração OneSignal scaffolded, mas `sendPushNotification()` nunca é invocada em nenhum handler.
**Solução:** Chamar nas transições de estado críticas:
- Driver recebe `RIDE_REQUEST` → notificar se app em background
- Rider: corrida aceita, motorista chegou, pagamento confirmado
- Driver: aprovado pelo admin → notificar que pode trabalhar
- Coletar `playerId` do OneSignal no login/registro dos apps e salvar em `user.pushToken`

---

### [A3] Sem validação de entrada (corpo das requisições)
**Problema:** Nenhum schema de validação (Zod/Joi) nos controllers. Dados malformados são processados normalmente.
**Exemplos críticos:**
- Coordenadas GPS inválidas enviadas pelo rider criam corridas com `distance: null`
- OTP pode ser enviado como string vazia
- Campos de registro sem validação de formato
**Solução:** Adicionar validação com `zod` + plugin `fastify-type-provider-zod` nos endpoints:
- `POST /auth/register` — email, senha mínima, CPF (motorista), telefone
- `POST /auth/login` — email + senha obrigatórios
- `POST /rides` — coordenadas válidas (lat/lng dentro dos limites)
- Eventos WebSocket — validar payload antes de processar

---

### [A4] Motorista aprovado não recebe notificação
**Arquivo:** `apps/backend/src/modules/user/user.service.ts`
**Problema:** Admin aprova motorista no painel, mas o driver app continua mostrando "aguardando aprovação" até o usuário fechar e reabrir o app manualmente.
**Solução:** Após `isApproved = true` no banco:
1. Emitir evento WebSocket `driver:approved` para o socket do driver (se online)
2. Enviar push notification via OneSignal
3. Driver app: ouvir `driver:approved` e atualizar estado local

---

### [A5] Flag de segunda corrida perdida se app reiniciar
**Arquivo:** `apps/backend/src/infrastructure/websocket/handlers/driver.handler.ts`
**Problema:** `socket.data.secondRideAvailableNotified` existe apenas em memória. Se o motorista reconectar durante uma corrida `in_progress`, o sistema nunca mais emite `SECOND_RIDE_AVAILABLE`.
**Solução:** Persistir flag no documento da corrida: `ride.secondRideNotified: boolean`. Verificar no handler de reconexão junto com `RIDE_RESTORE`.

---

## 🟡 MÉDIO — Experiência do usuário e estabilidade

### [M1] Sem tratamento de permissão de localização negada
**Arquivos:** `apps/driver/app/(tabs)/index.tsx`, `apps/rider/app/(tabs)/index.tsx`
**Problema:** Se o usuário negar permissão de localização, o mapa fica em branco sem mensagem.
**Solução:** Exibir tela/modal explicativo com botão para abrir Configurações do sistema quando `status !== 'granted'`.

---

### [M2] Sem rate limiting nas APIs
**Problema:** Motoristas podem spammar rejeições, riders podem criar múltiplas corridas simultaneamente, risco de DoS na criação de corridas.
**Solução:** Adicionar `@fastify/rate-limit`:
- `POST /auth/login`: 10 tentativas/minuto por IP
- `POST /auth/register`: 5/hora por IP
- `POST /rides`: 1 corrida ativa por rider (validar no serviço)
- Socket `RIDE_REQUEST_RESPONSE`: debounce de 2s por motorista

---

### [M3] MongoDB sem índices para queries comuns
**Arquivo:** `apps/backend/src/modules/ride/ride.schema.ts`, `apps/backend/src/modules/user/user.schema.ts`
**Problema:** Sem índices, queries de histórico e listagem ficam lentas com volume de dados.
**Solução:** Adicionar índices no schema:
```typescript
// ride.schema.ts
RideSchema.index({ riderId: 1, status: 1 });
RideSchema.index({ driverId: 1, status: 1 });
RideSchema.index({ status: 1, createdAt: -1 });
RideSchema.index({ createdAt: -1 });
```

---

### [M4] Cancelamento de corrida em andamento bloqueado
**Arquivo:** `apps/backend/src/modules/ride/ride.service.ts`
**Problema:** Rider só pode cancelar em `searching_driver` ou `driver_assigned`. Não há fluxo para cancelamento após embarque (com cobrança de taxa).
**Solução MVP:** Permitir cancelamento em `in_progress` com taxa fixa (ex: R$ 5,00), debitar do saldo do rider, creditar parcialmente ao driver. Emitir `RIDE_STATUS_UPDATE { status: 'cancelled', cancellationFee: 5 }`.

---

### [M5] Estado do socket não compatível com múltiplas instâncias
**Arquivo:** `apps/backend/src/infrastructure/websocket/socket.ts`
**Problema:** `socket.data.*` (activeRideId, queuedRideId, activeRideRiderId) armazenado apenas em memória do processo. Com 2+ instâncias do backend (escala horizontal), estado fica inconsistente.
**Solução MVP:** Usar Redis para persistir estado do driver:
```typescript
await redis.hset(`driver:state:${driverId}`, { activeRideId, queuedRideId });
```
Já existe cliente Redis no projeto, basta usar.

---

### [M6] JWT secret hardcoded como fallback inseguro
**Arquivo:** `apps/backend/src/modules/auth/auth.service.ts`
**Problema:** `process.env.JWT_SECRET || 'dev_secret_change_in_production'` — se a env var não for definida em produção, tokens são assinados com segredo fraco e previsível.
**Solução:** Remover fallback. Fazer o servidor falhar no startup se `JWT_SECRET` não estiver definido:
```typescript
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is required');
```

---

### [M7] docker-compose sem serviço MongoDB
**Arquivo:** `infra/docker-compose.yml`
**Problema:** Compose sobe Redis e backend, mas não MongoDB. Desenvolvedor precisa instalar Mongo separadamente.
**Solução:** Adicionar serviço `mongodb` ao compose:
```yaml
mongodb:
  image: mongo:7
  ports: ["27017:27017"]
  volumes: ["mongo_data:/data/db"]
```

---

### [M8] Env var com typo no nome
**Arquivo:** `apps/backend/src/infrastructure/routes/ors.client.ts` (linha 21)
**Problema:** Variável nomeada `OPENAI_ROUTES_SERVICE` — nome errado, confunde com OpenAI.
**Solução:** Renomear para `ORS_BASE_URL` e atualizar `.env.example`.

---

## 🟢 BAIXO — Polimento e qualidade

### [L1] Sem histórico de corridas no backend paginado
**Solução:** `GET /api/rides?page=1&limit=20&status=completed` com cursor-based pagination.

### [L2] Sem sistema de avaliação (rating)
**Solução MVP:** Após `completed`, emitir evento `RIDE_COMPLETED` com prompt para rider avaliar motorista (1-5 estrelas). Salvar `ride.driverRating` e calcular média em `user.averageRating`.

### [L3] Chat entre rider e driver não implementado
**Evento:** `SocketEvents.CHAT_MESSAGE` definido em `shared-events` mas sem handler.
**Solução MVP:** Handler simples que retransmite mensagem entre os dois sockets da corrida ativa.

### [L4] Sem tela de recuperação de senha
**Solução:** `POST /auth/forgot-password` → enviar email com link de reset (usar Nodemailer + Gmail ou AWS SES).

### [L5] Cobertura de testes insuficiente
**Status atual:**
- Admin: ✓ testes de use-cases básicos
- Backend: ✗ zero testes
- Driver/Rider: ✗ zero testes
**Solução:** Priorizar testes do backend:
- `ride.service.test.ts`: criar corrida, aceitar, rejeitar, OTP
- `auth.service.test.ts`: registro, login, token expirado
- `user.service.test.ts`: aprovar motorista, desativar

### [L6] Documentos S3 acessíveis por URL pública
**Problema:** CNH e documentos do veículo são armazenados com URL pública permanente.
**Solução:** Gerar signed URLs com expiração (ex: 1h) ao servir `GET /api/users/me` ou `GET /api/users/:id`.

### [L7] Sem logs estruturados
**Solução:** Adicionar `pino` (já incluso no Fastify) com níveis: `info` para eventos de corrida, `warn` para rejeições, `error` para falhas de integração. Remover `console.log` soltos.

---

## Resumo por Prioridade

| ID  | Descrição                                      | Prioridade | Esforço |
|-----|------------------------------------------------|------------|---------|
| ~~C1~~ | ~~Geocodificação indefinida~~ ✅ RESOLVIDO   | -           | -       |
| C2  | Tabs Histórico/Carteira vazias (crasha)        | 🔴 Crítico  | Médio   |
| C3  | Pagamento fake — integrar Mercado Pago         | 🔴 Crítico  | Alto    |
| C4  | Chave Google Maps placeholder                  | 🔴 Crítico  | Baixo   |
| A1  | Rotas admin desprotegidas                      | 🟠 Alto     | Baixo   |
| A2  | Push notifications nunca disparadas            | 🟠 Alto     | Médio   |
| A3  | Sem validação de entrada                       | 🟠 Alto     | Médio   |
| A4  | Driver não notificado quando aprovado          | 🟠 Alto     | Baixo   |
| A5  | Flag segunda corrida perdida no restart        | 🟠 Alto     | Baixo   |
| M1  | Sem tela de permissão de localização negada    | 🟡 Médio    | Baixo   |
| M2  | Sem rate limiting                              | 🟡 Médio    | Baixo   |
| M3  | MongoDB sem índices                            | 🟡 Médio    | Baixo   |
| M4  | Cancelamento de corrida em andamento           | 🟡 Médio    | Médio   |
| M5  | Estado WebSocket não escala (multi-instância)  | 🟡 Médio    | Médio   |
| M6  | JWT secret com fallback inseguro               | 🟡 Médio    | Baixo   |
| M7  | docker-compose sem MongoDB                     | 🟡 Médio    | Baixo   |
| M8  | Typo na env var ORS                            | 🟡 Médio    | Baixo   |
| L1  | Histórico paginado                             | 🟢 Baixo    | Baixo   |
| L2  | Sistema de avaliação                           | 🟢 Baixo    | Médio   |
| L3  | Chat rider-driver                              | 🟢 Baixo    | Baixo   |
| L4  | Recuperação de senha                           | 🟢 Baixo    | Baixo   |
| L5  | Cobertura de testes backend                    | 🟢 Baixo    | Alto    |
| L6  | URLs S3 privadas (signed)                      | 🟢 Baixo    | Baixo   |
| L7  | Logs estruturados                              | 🟢 Baixo    | Baixo   |

---

## Checklist MVP Mínimo (para lançar)

Para considerar o projeto "lançável" como MVP funcional, os seguintes itens devem estar 100%:

- [x] **[C1]** Geocodificação funcionando — ✅ já implementado com Nominatim
- [x] **[C2]** Tabs Histórico e Carteira implementadas (sem crash)
- [ ] **[C3]** Pagamento real integrado (Mercado Pago ou equivalente)
- [ ] **[C4]** Google Maps API key configurada
- [ ] **[A1]** Middleware de admin protegendo rotas sensíveis
- [ ] **[A2]** Push notification na chegada de corrida (driver) e aceitação (rider)
- [ ] **[A4]** Driver notificado ao ser aprovado
- [ ] **[M6]** JWT sem fallback inseguro
- [ ] **[M7]** docker-compose com MongoDB para ambiente de dev
- [ ] **[M8]** Typo da env var ORS corrigido

Os itens L1–L7 e M1–M5 podem ser feitos em iterações pós-lançamento.

---

## Variáveis de Ambiente Obrigatórias (ainda não configuradas)

```env
# Backend
MONGODB_URI=                    # obrigatório
REDIS_URL=                      # obrigatório
JWT_SECRET=                     # obrigatório (sem fallback)
GOOGLE_API_KEY=                 # obrigatório (geocoding)
ORS_API_KEY=                    # obrigatório (cálculo de rotas)
ORS_BASE_URL=                   # obrigatório (renomear de OPENAI_ROUTES_SERVICE)
AWS_ACCESS_KEY_ID=              # obrigatório (uploads S3)
AWS_SECRET_ACCESS_KEY=          # obrigatório
AWS_S3_BUCKET=                  # obrigatório
MERCADO_PAGO_ACCESS_TOKEN=      # obrigatório (pagamento)
ONESIGNAL_APP_ID=               # obrigatório (push notifications)
ONESIGNAL_API_KEY=              # obrigatório

# Apps Expo (driver + rider)
EXPO_PUBLIC_API_URL=            # URL do backend (não hardcoded)
EXPO_PUBLIC_GOOGLE_API_KEY=     # chave Google Maps para Android
```
