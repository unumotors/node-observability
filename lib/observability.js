/* eslint-disable global-require */
require('./unhandledpromise')

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
    this.tracer = require('./datadog')
    // MUST be the first function included in the init function
    this.tracer.init(config)
    this.monitoring = require('./monitoring')
    const wrapperSentry = require('./sentry')
    wrapperSentry.init(config.sentry)
    // eslint-disable-next-line prefer-destructuring
    this.Sentry = wrapperSentry.Sentry
    this.metrics = require('./metrics')
    this.monitoring.init(config.monitoring)
    return this
  }
}

module.exports = Observability
