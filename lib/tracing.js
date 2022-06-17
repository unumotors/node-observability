/* eslint-disable max-len */
const opentelemetry = require('@opentelemetry/sdk-node')
const api = require('@opentelemetry/api')

const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { JaegerPropagator } = require('@opentelemetry/propagator-jaeger')

// Naming and conventions
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { Resource } = require('@opentelemetry/resources')

// Instrumentations
const { AmqplibInstrumentation } = require('opentelemetry-instrumentation-amqplib')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { MongooseInstrumentation } = require('opentelemetry-instrumentation-mongoose')
const { SocketIoInstrumentation } = require('opentelemetry-instrumentation-socket.io')

const { getEnvironment, tracingFilterRegex } = require('./helpers')

class Tracing {
  constructor(config = {}) {
    this.config = {
      enabled: !!process.env.TRACING_ENABLED,
      debug: !!process.env.TRACING_DEBUG,
      captureMongoQueries: !!process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED,
      uri: process.env.TRACING_URI || `http://localhost:4318/v1/traces`,
      tracingExpressEnabled: !!process.env.TRACING_EXPRESS_ENABLED,
      ...config // overwrite all values with passed values
    }

    if (this.config.debug) {
      api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.DEBUG)
    }

    if (!this.config.serviceName) {
      throw new Error('serviceName is required for tracing')
    }
  }

  async start() {
    if (!this.isEnabled()) return
    // This adds resources to all traces (Resource: immutable representation of the entity producing telemetry)
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: getEnvironment(this.config)
    })

    // What instrumentations to use
    const instrumentations = [
      // default (dns, http, grpc, express, koa, graphql, iosredis, redis, pg, mongodb and mysql)
      // ref https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/metapackages/auto-instrumentations-node
      getNodeAutoInstrumentations({
        // https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-instrumentation-http
        '@opentelemetry/instrumentation-http': {
          // dont create traces for monitoring endpoints (spammy)
          ignoreIncomingPaths: tracingFilterRegex,
          requestHook: httpInstrumentationHook,
          responseHook: httpInstrumentationHook
        },
        '@opentelemetry/instrumentation-express': {
          ignoreLayersType: this.config.tracingExpressEnabled ? [] : ['middleware', 'router', 'request_handler']
        }
      }),
      // Mongoose
      // https://github.com/aspecto-io/opentelemetry-ext-js/tree/master/packages/instrumentation-mongoose
      new MongooseInstrumentation({
        suppressInternalInstrumentation: true, // we do not need the internal traces, we have this library
        requireParentSpan: false, // capture all
        // add full query information if tracing was setup to do so only
        dbStatementSerializer: (operation, payload) => {
          try {
            if (this.config.captureMongoQueries) return `${operation}: ${JSON.stringify(payload)}`
          } catch (error) { // This function cannot fail
            console.error('Error in tracing (dbStatementSerializer)', error)
          }
          return ''
        }
      }),
      // amqplib/RabbitMQ
      // https://github.com/aspecto-io/opentelemetry-ext-js/tree/master/packages/instrumentation-amqplib
      new AmqplibInstrumentation({
        consumeHook: ampqInstrumentalizationHook,
        publishHook: ampqInstrumentalizationHook
      }),
      // Socket.io
      // https://github.com/aspecto-io/opentelemetry-ext-js/tree/master/packages/instrumentation-socket.io
      new SocketIoInstrumentation({
        traceReserved: true // also trace "connection", "disconnect" and so on
      })
    ]

    // Jaeger propagation
    // This makes sure the the old tracing (that also uses jaeger propagation)
    // Is compatible to the new one
    const textMapPropagator = new JaegerPropagator()

    // Exporter, can be overwritten by unit tests for example
    const traceExporter = this.config.traceExporter ? this.config.traceExporter :
      // OTel trace exporter
      // https://www.npmjs.com/package/@opentelemetry/exporter-collector
      new OTLPTraceExporter({
        url: this.config.uri
      })

    // https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-sdk-node
    this.sdk = new opentelemetry.NodeSDK({
      resource,
      traceExporter,
      instrumentations,
      textMapPropagator
    })

    await this.sdk.start()
    this.tracer = api.trace.getTracer('default')
  }

  isEnabled() {
    return this.config.enabled
  }

  currentTraceId() {
    if (!this.config.enabled || !this.tracer) return undefined
    const currentSpan = this.currentSpan()
    return currentSpan?.spanContext()?.traceId
  }

  // This is kept for backwards compatibility
  currentRootSpan() {
    return this.currentSpan()
  }

  currentSpan() {
    if (!this.config.enabled || !this.tracer) return undefined
    return api.trace.getSpan(api.context.active())
  }

  addAttribute(key, value) {
    if (!this.config.enabled || !this.tracer) return undefined
    const currentSpan = this.currentSpan()
    currentSpan && currentSpan.setAttribute(key, value)
  }

  recordException(exception) {
    if (!this.config.enabled || !this.tracer) return undefined
    const currentSpan = this.currentSpan()
    currentSpan && currentSpan.recordException(exception)
  }

  // This API is kept for backwards compatibility
  addRootSpanAttribute(key, value) {
    return this.addAttribute(key, value)
  }
}

/**
 * This function adds attributes to http requests and responses
 *
 * @param {Span} span
 * @returns Span with added attributes
 */
function httpInstrumentationHook(span) {
  // backwards compatibility for old tracing results (so we can use this attribute in queries in honeycomb still)
  const path = span.attributes['http.target']
  const method = span.attributes['http.method']
  span.setAttribute('http.path', path)
  // This replaces the useless "HTTP GET" name
  span.updateName(`${method} ${path}`)
  return span
}

/**
 * This functions removes sensitive attributes from ampq Spans
 *
 * @param {Span} span
 * @returns Span with removed attributes
 */
function ampqInstrumentalizationHook(span) {
  // Remove secret parameter (this contains our rabbitmq passwords)
  span.attributes && delete span.attributes['messaging.url']
  return span
}

module.exports = Tracing
