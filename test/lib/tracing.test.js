const test = require('ava')
const Tracing = require('../../lib/tracing')
const sinon = require('sinon')
const { ObjectTraceExporter } = require('@opencensus/exporter-object')
const { SpanVerifier } = require('../helpers/tracing')

// Create a sinon sandbox which automatically gets restored between tests
test.beforeEach((t) => {
  t.context.sinon = sinon.createSandbox()
})

test.afterEach((t) => {
  t.context.sinon.restore()
})


test('Should return a Object', t => {
  t.truthy(Tracing)
  const trace = new Tracing({ serviceName: 'foo' })
  t.truthy(trace)
})

test('should validate serviceName is required', t => {
  const error = t.throws(() => {
    // eslint-disable-next-line no-new
    new Tracing({})
  }, Error)
  t.is(error.message, 'serviceName is required')
})

test('should configure but not start tracing when not enabled', t => {
  const trace = new Tracing({ serviceName: 'foo', enabled: false })
  trace.exporter = new ObjectTraceExporter()
  trace.start()
  t.truthy(trace.exporter)
  t.falsy(trace.propagation)
})

test('should configure and start tracing when called', t => {
  // localhost as just enabling this causes a dns lookup
  const trace = new Tracing({ serviceName: 'foo', enabled: true, host: 'localhost' })
  // Force it to use the object exporter so it doesn't contact jaeger
  trace.exporter = new ObjectTraceExporter()
  trace.start()
  t.truthy(trace.exporter)
  t.truthy(trace.propagation)
  // Make sure we have access to the tracer
  t.truthy(trace.tracer)
})

test('should configure and start tracing when called with env enabled', t => {
  // localhost as just enabling this causes a dns lookup
  process.env.TRACING_ENABLED = true
  let trace = new Tracing({ serviceName: 'foo', host: 'localhost' })
  t.is(trace.isEnabled(), true)
  process.env.TRACING_ENABLED = true
  trace = new Tracing({ serviceName: 'foo', enabled: false, host: 'localhost' })
  t.is(trace.isEnabled(), false)
  delete process.env.TRACING_ENABLED
})

test('should be disabled by default', t => {
  let trace = new Tracing({ serviceName: 'foo' })
  t.is(trace.isEnabled(), false)
  trace = new Tracing({ serviceName: 'foo', enabled: true, host: 'localhost' })
  t.is(trace.isEnabled(), true)
})


test('should be able to configure debug settings', t => {
  let trace = new Tracing({ serviceName: 'foo', enabled: true, host: 'localhost' })
  t.is(trace.config.debug, false)
  t.is(trace.config.logLevel, undefined)
  t.is(trace.config.logger, undefined)
  trace = new Tracing({
    serviceName: 'foo', enabled: true, debug: true, host: 'localhost'
  })
  t.is(trace.config.debug, true)
  t.is(trace.config.logLevel, 5)
  t.is(trace.config.logger, console)
  process.env.TRACING_DEBUG = true
  trace = new Tracing({ serviceName: 'foo' })
  t.is(trace.config.debug, true)
  t.is(trace.config.logLevel, 5)
  t.is(trace.config.logger, console)
})

test.cb('should have environment attribute test by default', t => {
  const tracing = new Tracing({
    serviceName: 'foo', enabled: true
  })
  tracing.start()
  const { tracer } = tracing
  const rootSpanVerifier = new SpanVerifier()
  tracer.registerSpanEventListener(rootSpanVerifier)
  tracer.startRootSpan({ name: 'insertRootSpan' }, function(rootSpan) {
    rootSpan.end()
    t.deepEqual(rootSpanVerifier.endedSpans[0].attributes, {
      environment: 'test'
    })
    t.end()
  })
})

test.cb('should have APP_ENV environment attribute by default', t => {
  const orgEnv = process.env.APP_ENV
  process.env.APP_ENV = 'unit-test-overwrite'
  const tracing = new Tracing({
    serviceName: 'foo', enabled: true
  })
  tracing.start()
  const { tracer } = tracing
  const rootSpanVerifier = new SpanVerifier()
  tracer.registerSpanEventListener(rootSpanVerifier)
  tracer.startRootSpan({ name: 'insertRootSpan' }, function(rootSpan) {
    rootSpan.end()
    t.deepEqual(rootSpanVerifier.endedSpans[0].attributes, {
      environment: 'unit-test-overwrite'
    })
    process.env.APP_ENV = orgEnv
    t.end()
  })
})
