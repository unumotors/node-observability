/* eslint-disable global-require */
const UnhandledRejection = require('./unhandledrejection')
const MonitorServer = require('./monitoring')
const Tracing = require('./tracing')
const { FeatureFlags } = require('./feature-flags')

class Observability {
  constructor() {
    this.initialized = false
  }

  init(testingConfigOverwrites = {}) {
    if (this.initialized) {
      throw new Error('Already initialized')
    }

    this.initialized = true
    // Must be required before any thing else
    // This has been removed until we improve its api
    const tracingConfig = {
      ...{
        serviceName: process.env.OBSERVABILITY_SERVICE_NAME,
      },
    }
    this.tracing = new Tracing(tracingConfig)
    this.tracing.start()
    // MUST be the first function included in the init function
    // This should be raw config (or a merged has)
    // we need acces to env/serviceName
    // this.tracer.init(config)
    this.monitoring = new MonitorServer(this.tracing)

    const wrapperSentry = require('./sentry')
    wrapperSentry.init(testingConfigOverwrites.sentry)
    this.unhandledRejection = new UnhandledRejection()
    this.unhandledRejection.init()
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
    this.featureFlags.init()
    return this
  }
}

module.exports = Observability
