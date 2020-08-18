/* eslint-disable max-len */
const ocTracing = require('@opencensus/nodejs')
const ocagent = require('@opencensus/exporter-ocagent')
const { getEnvironment, tracingFilterRegex } = require('./helpers')
const config = require('./config')

class Tracing {
  constructor(config = {}) {
    this.config = Object.assign({
      enabled: !!process.env.TRACING_ENABLED,
      port: process.env.TRACING_PORT || 55678,
      host: process.env.TRACING_HOST || 'ocagent',
      bufferTimeout: 500, // time in milliseconds
      debug: !!process.env.TRACING_DEBUG
    }, config)


    if (this.config.debug) {
      this.config.logLevel = 5
      this.config.logger = console
    }

    if (!this.config.serviceName) {
      throw new Error('serviceName is required')
    }
  }

  start() {
    if (this.isEnabled()) {
      this.propagation = config.tracing.propagation
      // Allow overriding the exporter
      if (!this.exporter) {
        this.exporter = new ocagent.OCAgentExporter(this.config)
      }

      this.tracer = ocTracing.start({
        defaultAttributes: {
          environment: getEnvironment(this.config)
        },
        exporter: this.exporter,
        propagation: this.propagation,
        logLevel: this.config.logLevel,
        plugins: {
          // Overwrite mongodb plugin with our own version as the official one from
          // https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-instrumentation-mongodb
          // does not work currently
          mongodb: require.resolve('./mongodb-tracing'),
          // Ignore all monitoring requests
          http: {
            module: '@opencensus/instrumentation-http',
            config: {
              ignoreIncomingPaths: tracingFilterRegex
            }
          }
        }
      }).tracer
    }
  }

  isEnabled() {
    return this.config.enabled
  }

  currentTraceId() {
    const currentRootSpan = this.currentRootSpan()
    return currentRootSpan && currentRootSpan.traceIdLocal
  }

  currentRootSpan() {
    return this.isEnabled() && this.tracer && this.tracer.currentRootSpan
  }

  addRootSpanAttribute(key, value) {
    const currentRootSpan = this.currentRootSpan()
    currentRootSpan && currentRootSpan.addAttribute(key, value)
  }
}

module.exports = Tracing
