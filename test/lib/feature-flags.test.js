const test = require('ava')
const sinon = require('sinon')
const { unleash, FeatureFlags } = require('../../lib/feature-flags')

const originalEnv = { ...process.env }

test.afterEach(() => {
  sinon.restore()
  process.env = { ...originalEnv }
})

test.serial('FeatureFlags can be disabled by an environment flag', (t) => {
  process.env.FEATURE_FLAGS_DISABLED = 'true'
  const featureFlags = new FeatureFlags()
  featureFlags.init()
  t.is(featureFlags.disabled, true)
})

test.serial('FeatureFlags initiation fails if required parameters are not passed', (t) => {
  const featureFlags = new FeatureFlags()
  t.throws(() => {
    featureFlags.init()
  }, { message: 'GitLab Feature Flag initiation failed. You need to set FEATURE_FLAGS_INSTANCE_ID' })
  process.env.FEATURE_FLAGS_INSTANCE_ID = 'test'
  t.throws(() => {
    featureFlags.init()
  }, { message: 'GitLab Feature Flag initiation failed. You need to set FEATURE_FLAGS_URL' })
})

test.serial('FeatureFlags initiation passes required values to unleash client correctly', (t) => {
  const featureFlags = new FeatureFlags()
  const unleashInitiationStub = sinon.stub(unleash, 'initialize')
    .returns({ fake: 'client' })

  process.env.FEATURE_FLAGS_INSTANCE_ID = 'instance-id'
  process.env.FEATURE_FLAGS_URL = 'url'

  featureFlags.init()

  t.deepEqual(unleashInitiationStub.firstCall.lastArg, {
    appName: 'test',
    instanceId: 'instance-id',
    url: 'url',
  })

  t.deepEqual(featureFlags.unleash, { fake: 'client' })
  t.is(featureFlags.disabled, false)
})

test.serial('FeatureFlags required parameters can be passed using env variables', (t) => {
  const featureFlags = new FeatureFlags()
  const unleashInitiationStub = sinon.stub(unleash, 'initialize')
    .returns({ fake: 'client' })

  process.env.FEATURE_FLAGS_INSTANCE_ID = 'instance-id'
  process.env.FEATURE_FLAGS_URL = 'url'
  process.env.FEATURE_FLAGS_UNLEASH_OPTIONS = '{"metricsInterval":6000,"httpOptions":{}}'

  featureFlags.init({})

  t.deepEqual(unleashInitiationStub.firstCall.lastArg, {
    appName: 'test',
    instanceId: 'instance-id',
    url: 'url',
    metricsInterval: 6000,
    httpOptions: {},
  })

  t.deepEqual(featureFlags.unleash, { fake: 'client' })
  t.is(featureFlags.disabled, false)
})

test.serial('FeatureFlags.isEnabled returns false by default', (t) => {
  process.env.FEATURE_FLAGS_DISABLED = 'true'

  const featureFlags = new FeatureFlags()
  featureFlags.init()

  t.is(featureFlags.isEnabled('some_flag'), false)
  t.is(featureFlags.isEnabled('some_flag', {}), false)

  featureFlags.unleash = undefined

  t.is(featureFlags.isEnabled('some_flag'), false)
  t.is(featureFlags.isEnabled('some_flag', {}), false)
})

test.serial('FeatureFlags.isEnabled passes all values correctly to unleash client', (t) => {
  const featureFlags = new FeatureFlags()

  featureFlags.disabled = false
  featureFlags.unleash = { isEnabled: sinon.stub().returns(true) }

  const isEnabled = featureFlags.isEnabled('some_feature', { userId: 'auth0|user@unumotors.com' })

  t.is(isEnabled, true)
  t.is(featureFlags.unleash.isEnabled.firstCall.args[0], 'some_feature')
  t.deepEqual(featureFlags.unleash.isEnabled.firstCall.args[1], { userId: 'auth0|user@unumotors.com' })
})
