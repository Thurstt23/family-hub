import type { Instrumentation } from 'next'

// Every unhandled server error becomes one structured log line in Vercel
// (search `"level":"error"`), and failures on the money and job routes are
// also emailed to ALERT_EMAIL (09, section 7).
//
// This file is also compiled for the Edge runtime that runs middleware. The
// email code (Resend, React Email, env validation) must never be bundled
// there: it crashed every request with MIDDLEWARE_INVOCATION_FAILED. Keep the
// Node-only import inside an `if (process.env.NEXT_RUNTIME === 'nodejs')`
// block, which the compiler removes entirely from the Edge build.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err as Error & { digest?: string }
  const details = {
    path: request.path,
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
    message: error.message,
    digest: error.digest,
  }
  console.error(JSON.stringify({ level: 'error', event: 'request.error', ...details, at: new Date().toISOString() }))

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (request.path.startsWith('/api/webhooks') || request.path.startsWith('/api/cron')) {
      const { alertOps } = await import('./lib/observability/alert')
      await alertOps('route.crashed', details)
    }
  }
}
