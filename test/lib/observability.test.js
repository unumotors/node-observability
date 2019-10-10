const test = require('ava')
const Observability = require('../../lib/observability')

const defaultConfig = { serviceName: 'foo' }

test('Should throw an error if already initialized', async t => {
  const index = new Observability()
  index.init(defaultConfig)
  await index.monitoring.close()
  const err = t.throws(() => {
    index.init(defaultConfig)
  })
  t.is(err.message, 'Already initialized')
  await index.monitoring.close()
})

test('Should setup correct instance methods', t => {
  const index = new Observability()
  t.falsy(index.Sentry)
  t.falsy(index.metrics)
  t.falsy(index.monitoring)
  //t.falsy(index.tracer)
  index.init(defaultConfig)
  t.truthy(index.Sentry)
  t.truthy(index.metrics)
  t.truthy(index.monitoring)
  //t.truthy(index.tracer)
  t.truthy(index.Sentry)
})
