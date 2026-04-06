/* global process */

const buckets = new Map()

const nowMs = () => Date.now()

const getIp = (req) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  if (forwarded) return forwarded
  const real = String(req.headers['x-real-ip'] || '').trim()
  if (real) return real
  return 'unknown'
}

const cleanup = (cutoff) => {
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || typeof bucket !== 'object') {
      buckets.delete(key)
      continue
    }
    if (bucket.resetAt <= cutoff) buckets.delete(key)
  }
}

export const rateLimit = ({ req, res, key, limit = 30, windowMs = 60_000 }) => {
  const enabled = String(process.env.RATE_LIMIT_ENABLED || 'true').trim().toLowerCase() !== 'false'
  if (!enabled) return { ok: true, remaining: null }

  const ip = getIp(req)
  const bucketKey = `${key}:${ip}`
  const now = nowMs()

  const existing = buckets.get(bucketKey)
  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs })
    cleanup(now - windowMs * 10)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - 1)))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + windowMs) / 1000)))
    return { ok: true, remaining: limit - 1 }
  }

  existing.count += 1
  buckets.set(bucketKey, existing)

  const remaining = Math.max(0, limit - existing.count)
  res.setHeader('X-RateLimit-Limit', String(limit))
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(existing.resetAt / 1000)))

  if (existing.count > limit) {
    res.status(429).json({ message: 'Too many requests. Please try again shortly.' })
    return { ok: false, remaining }
  }

  return { ok: true, remaining }
}

