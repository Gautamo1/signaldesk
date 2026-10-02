import type { NextFunction, Request, Response } from 'express'

/** Application-level HTTP error with status code and optional structured payload. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message)
  }
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown

/** Wrap async route handlers so rejections reach the error middleware. */
export const asyncH =
  (fn: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

export function sendError(res: Response, err: unknown): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, ...(err.extra ?? {}) })
    return
  }
  const anyErr = err as { name?: string; issues?: Array<{ path: PropertyKey[]; message: string }>; code?: string }
  if (anyErr?.name === 'ZodError' && Array.isArray(anyErr.issues)) {
    const fields: Record<string, string> = {}
    for (const issue of anyErr.issues) {
      const key = String(issue.path[0] ?? '_')
      if (!fields[key]) fields[key] = issue.message
    }
    res.status(400).json({ error: 'Validation failed', code: 'validation', fields })
    return
  }
  if (anyErr?.code === '23505') {
    res.status(409).json({ error: 'A record with this value already exists', code: 'duplicate' })
    return
  }
  if (anyErr?.code === '23503') {
    res.status(409).json({ error: 'Referenced record does not exist', code: 'reference' })
    return
  }
  console.error('[api] unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
}

export function notFoundApi(res: Response, what = 'Resource'): void {
  res.status(404).json({ error: `${what} not found`, code: 'not_found' })
}
