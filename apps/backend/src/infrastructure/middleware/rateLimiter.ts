import { Request, Response, NextFunction } from 'express'

interface RateLimitEntry {
  count: number
  resetAt: number
}

export function createRateLimiter(windowMs: number, max: number, message = 'Muitas tentativas. Tente novamente mais tarde.') {
  const store = new Map<string, RateLimitEntry>()

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, 5 * 60 * 1000)

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    entry.count++
    if (entry.count > max) {
      res.status(429).json({ message })
      return
    }

    next()
  }
}
