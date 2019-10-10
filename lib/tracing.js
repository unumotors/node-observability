const ocTracing = require('@opencensus/nodejs')
const ocagent = require('@opencensus/exporter-ocagent')
const propagation = require('@opencensus/propagation-jaeger')

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
      this.tracer = ocTracing.start({ 'exporter': this.exporter, 'propagation': this.propagation }).tracer
    }
  }

  isEnabled() {
    return this.config.enabled
  }
}

module.exports = Tracing
