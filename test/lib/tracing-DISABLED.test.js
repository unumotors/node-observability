/* eslint-disable no-underscore-dangle */
/* eslint-disable global-require */
process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED = 'true'

const test = require('ava')

const Tracing = require('../../lib/tracing')

// Tracing needs to go before the imports (as it does when importing node-observabilty)
const tracing = new Tracing({
  enabled: false,
  serviceName: 'unit-test',
})

test.serial('isEnabled() returns correct value', (t) => {
  t.is(tracing.isEnabled(), false)
})

test.serial('currentTraceId() does not fail', (t) => {
  t.is(tracing.currentTraceId(), undefined)
})

test.serial('currentRootSpan() does not fail', (t) => {
  t.is(tracing.currentRootSpan(), undefined)
})

test.serial('addRootSpanAttribute() does not fail', (t) => {
  t.is(tracing.currentRootSpan(), undefined)
})
