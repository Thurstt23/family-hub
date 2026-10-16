import type { Instrumentation } from 'next'

// Every unhandled server error becomes one structured log line in Vercel
// (search `"level":"error"`), and failures on the money and job routes are
// also emailed to ALERT_EMAIL (09, section 7: any 500 on the webhook, any
// non-200 from cron).
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

  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (request.path.startsWith('/api/webhooks') || request.path.startsWith('/api/cron')) {
    const { alertOps } = await import('@/lib/observability/alert')
    await alertOps('route.crashed', details)
  }
}
