/* eslint-disable max-len */
const ocTracing = require('@opencensus/nodejs')
const ocagent = require('@opencensus/exporter-ocagent')
const propagation = require('@opencensus/propagation-jaeger')
const { getEnvironment } = require('./helpers')

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
      this.propagation = new propagation.JaegerFormat()
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
              ignoreIncomingPaths: [
                /^\/-\/readiness/,
                /^\/-\/liveness/,
                /^\/-\/ping/,
                /^\/ping/ // All paths equal to /ping
              ]
            }
          }
        }
      }).tracer
    }
  }

  isEnabled() {
    return this.config.enabled
  }
}

module.exports = Tracing
