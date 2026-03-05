const LEVELS: Record<string, number> = { error: 0, warn: 1, info: 2, debug: 3 }
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL ?? 'info'] ?? 2

function log(level: string, msg: string, data?: Record<string, unknown>): void {
  if ((LEVELS[level] ?? 99) > CURRENT_LEVEL) return
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg,
    ...data,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  info:  (msg: string, data?: Record<string, unknown>) => log('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => log('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
}
