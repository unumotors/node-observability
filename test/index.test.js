const test = require('ava')

process.env.OBSERVABILITY_SERVICE_NAME = 'index.test.js'
process.env.MONITOR_PORT = 9091 // so tests do not overlap

const Observability = require('../lib/observability')

// Just making sure its disabled by default
test('given tracing is not enabled it should not even be setup', (t) => {
  process.env.NODE_ENV = 'development'
  delete require.cache[require.resolve('../index')]
  // eslint-disable-next-line global-require
  const observability = require('../index')
  t.true(observability instanceof Observability)
  t.falsy(observability.tracing.isEnabled())
})
