/* eslint-disable global-require */
const UnhandledRejection = require('./unhandledrejection')
const MonitorServer = require('./monitoring')
const Tracing = require('./tracing')
const { FeatureFlags } = require('./feature-flags')

class Observability {
  constructor() {
    this.initialized = false
    this.config = {}
  }

  init(config = {}) {
    if (this.initialized) {
      throw new Error('Already initialized')
    }
    this.config = config
    this.initialized = true
    // Must be required before any thing else
    // This has been removed until we improve its api
    const tracingConfig = {
      ...{
        serviceName: process.env.OBSERVABILITY_SERVICE_NAME ?? config.serviceName,
      },
      ...config.tracing,
    }
    this.tracing = new Tracing(tracingConfig)
    this.tracing.start()
    // MUST be the first function included in the init function
    // This should be raw config (or a merged has)
    // we need acces to env/serviceName
    // this.tracer.init(config)
    this.monitoring = new MonitorServer(config.monitoring, this.tracing)

    const wrapperSentry = require('./sentry')
    wrapperSentry.init(config.sentry)
    this.unhandledRejection = new UnhandledRejection()
    this.unhandledRejection.init(config.unhandledRejection)
    // eslint-disable-next-line prefer-destructuring
    this.Sentry = wrapperSentry.Sentry
    this.metrics = require('./metrics')
    this.monitoring.init()
    this.monitoring.addOnSignalHook(async() => {
      // Shutdown tracing gracefully
      if (!this.tracing || !this.tracing.sdk) return
      await this.tracing.sdk.shutdown()
    })

    this.featureFlags = new FeatureFlags()
    this.featureFlags.init(config.featureFlags)
    return this
  }
}

module.exports = Observability
