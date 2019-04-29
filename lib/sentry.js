const Sentry = require('@sentry/node')
const { getEnvironment } = require('./helpers')

const init = function(config = {}) {
  const dsn = process.env.SENTRY_DSN || config.dsn
  // This should be hard coded into the app
  // We disable sentry in development mode
  // this allows us to check the DSN into git (its public now)
  const enabled = !!config.dsn && process.env.NODE_ENV != 'development'
  // APP_ENV takes precedence over NODE_ENV
  const environment = getEnvironment(config)
  // NODE_ENV is different from APP_ENV
  if (process.env.NODE_ENV == 'production' && !enabled) {
    // This is a requirement
    throw new Error('Sentry not enabled in production env')
  }

  Sentry.init({
    dsn,
    enabled,
    environment
  })
}

module.exports = { init, Sentry }
