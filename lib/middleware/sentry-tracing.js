const { Sentry } = require('../sentry')

const config = require('../config')

const { propagation } = config.tracing

function sentryTracingIdMiddleware(req, res, next) {
  const getter = {
    getHeader(name) {
      return req.headers[name]
    }
  }
  const { traceId } = propagation.extract(getter)
  if (traceId) {
    req.traceId = traceId // express servers might want to expose this
    Sentry.configureScope(function(scope) {
      scope.setTag('trace_id', traceId)
    })
  }
  next()
}

module.exports = sentryTracingIdMiddleware
