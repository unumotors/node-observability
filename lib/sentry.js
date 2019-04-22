const Sentry = require('@sentry/node')

Sentry.init({
  dsn: config.sentry.dsn,
  enabled: config.sentry.enabled,
  environment: config.env
})

const init = function(config = {}) {
  const dsn = config.dsn = process.env.SENTRY_DSN
  const enabled = config.enabled = !!process.env.SENTRY_DSN
  // APP_ENV takes precedence over NODE_ENV
  const environment = config.environment  = config.environment || process.env.APP_ENV || process.env.NODE_ENV
  if(environment == 'production' && enabled){
    // This is a requirement
    throw new Exception('Sentry not enabled in production env')
  }
  Sentry.init({
    dsn,
    enabled,
    environment
  })
}

module.exports = { init, Sentry }
