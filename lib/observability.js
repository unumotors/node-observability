/* eslint-disable global-require */
const UnhandledRejection = require('./unhandledrejection')
const MonitorServer = require('./monitoring')

class Observability {
  constructor() {
    this.initialized = false
  }

  init(config = {}) {
    if (this.initialized) {
      throw new Error('Already initialized')
    }
    this.initialized = true
    // Must be required before any thing else
    // This has been removed until we improve it's api
    //this.tracer = require('./datadog')
    // MUST be the first function included in the init function
    // This should be raw config (or a merged has)
    // we need acces to env/serviceName
    // this.tracer.init(config)
    this.monitoring = new MonitorServer()
    const wrapperSentry = require('./sentry')
    wrapperSentry.init(config.sentry)
    this.unhandledRejection = new UnhandledRejection()
    this.unhandledRejection.init(config.unhandledRejection)
    // eslint-disable-next-line prefer-destructuring
    this.Sentry = wrapperSentry.Sentry
    this.metrics = require('./metrics')
    this.monitoring.init(config.monitoring)
    return this
  }
}

module.exports = Observability
