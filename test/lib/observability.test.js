const test = require('ava')
const sinon = require('sinon')
const Observability = require('../../lib/observability')

test.afterEach(() => {
  sinon.restore()
})

test.serial('Should throw an error if already initialized', async(t) => {
  process.env.OBSERVABILITY_SERVICE_NAME = 'service-name'
  process.env.FEATURE_FLAGS_DISABLED = 'true'

  const index = new Observability()
  index.init()
  await index.monitoring.close()
  const err = t.throws(() => {
    index.init()
  })
  t.is(err.message, 'Already initialized')
  await index.monitoring.close()
})

test.serial('Should setup correct instance methods', (t) => {
  const index = new Observability()
  t.falsy(index.Sentry)
  t.falsy(index.metrics)
  t.falsy(index.monitoring)
  //t.falsy(index.tracer)
  index.init()
  t.truthy(index.Sentry)
  t.truthy(index.metrics)
  t.truthy(index.monitoring)
  //t.truthy(index.tracer)
  t.truthy(index.Sentry)
  t.truthy(index.featureFlags)
  t.is(index.featureFlags.disabled, true, 'feature flags init() should have been called')
})

test.serial('FeatureFlags works end to end', (t) => {
  const index = new Observability()

  delete process.env.FEATURE_FLAGS_DISABLED
  process.env.FEATURE_FLAGS_INSTANCE_ID = 'instance-id'
  process.env.FEATURE_FLAGS_URL = 'url'

  index.init()

  // A fake just wraps the real function without changing what it does
  // https://sinonjs.org/releases/v11.1.2/fakes/
  const isEnabledFake = sinon.replace(
    index.featureFlags.unleash,
    'isEnabled',
    sinon.fake(index.featureFlags.unleash.isEnabled),
  )

  const isEnabled = index.featureFlags.isEnabled('some_feature', { userId: 'auth0|user@unumotors.com' })

  t.is(isEnabled, false)
  t.is(isEnabledFake.callCount, 1)
  t.is(isEnabledFake.firstCall.args[0], 'some_feature')
  t.deepEqual(isEnabledFake.firstCall.args[1], { userId: 'auth0|user@unumotors.com' })

  index.featureFlags.unleash.destroy() // Make sure that the client is not continuing to poll
})
