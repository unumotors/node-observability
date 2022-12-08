const test = require('ava')
const helpers = require('../../lib/helpers')

test('given no NODE_ENV it defaults to test in unit tests', (t) => {
  t.is(helpers.getEnvironment({}), 'test')
})

test('given the right env getEnvironment should return the correct results', (t) => {
  process.env.NODE_ENV = 'node_env'
  t.is(helpers.getEnvironment({}), 'node_env')
  t.is(helpers.getEnvironment({ environment: 'config_env' }), 'config_env')
  process.env.APP_ENV = 'app_env'
  t.is(helpers.getEnvironment({ environment: 'config_env' }), 'app_env')
})

test('should match /ping URL', (t) => {
  t.regex('/ping', helpers.tracingFilterRegex[0])
})

test('should match /ping/ URL', (t) => {
  t.regex('/ping/', helpers.tracingFilterRegex[0])
})

test('should match /-/ping URL', (t) => {
  t.regex('/-/ping', helpers.tracingFilterRegex[1])
})

test('should match /-/ping/ URL', (t) => {
  t.regex('/-/ping/', helpers.tracingFilterRegex[1])
})

test('should match /-/metrics URL', (t) => {
  t.regex('/-/metrics', helpers.tracingFilterRegex[1])
})

test('should match /-/metrics/ URL', (t) => {
  t.regex('/-/metrics/', helpers.tracingFilterRegex[1])
})

test('should match /-/liveness URL', (t) => {
  t.regex('/-/liveness', helpers.tracingFilterRegex[1])
})

test('should match /-/liveness/ URL', (t) => {
  t.regex('/-/liveness/', helpers.tracingFilterRegex[1])
})

test('should match /-/readiness URL', (t) => {
  t.regex('/-/readiness', helpers.tracingFilterRegex[1])
})

test('should match /-/readiness/ URL', (t) => {
  t.regex('/-/readiness/', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/ping URL', (t) => {
  t.regex('/foo/-/ping', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/ping/ URL', (t) => {
  t.regex('/foo/-/ping/', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/metrics URL', (t) => {
  t.regex('/foo/-/metrics', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/metrics/ URL', (t) => {
  t.regex('/foo/-/metrics/', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/liveness URL', (t) => {
  t.regex('/foo/-/liveness', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/liveness/ URL', (t) => {
  t.regex('/foo/-/liveness/', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/readiness URL', (t) => {
  t.regex('/foo/-/readiness', helpers.tracingFilterRegex[1])
})

test('should match /foo/-/readiness/ URL', (t) => {
  t.regex('/foo/-/readiness/', helpers.tracingFilterRegex[1])
})

test('should not match /bar URL', (t) => {
  t.notRegex('/bar', helpers.tracingFilterRegex[0])
})

test('should not match /bar/ URL', (t) => {
  t.notRegex('/bar/', helpers.tracingFilterRegex[0])
})

test('should not match /-/bar URL', (t) => {
  t.notRegex('/-/bar', helpers.tracingFilterRegex[1])
})

test('should not match /-/bar/ URL', (t) => {
  t.notRegex('/-/bar/', helpers.tracingFilterRegex[1])
})

test('should not match /foo/-/bar URL', (t) => {
  t.notRegex('/foo/-/bar', helpers.tracingFilterRegex[1])
})

test('should not match /foo/-/bar/ URL', (t) => {
  t.notRegex('/foo/-/bar/', helpers.tracingFilterRegex[1])
})

test('should match /api/v4/feature_flags/unleash/673/client/features URL', (t) => {
  t.regex('/api/v4/feature_flags/unleash/673/client/features', helpers.tracingFilterRegex[2])
})

test('should not match /banana/api/v4/feature_flags/unleash/673/client/features URL', (t) => {
  t.notRegex('/banana/api/v4/feature_flags/unleash/673/client/features', helpers.tracingFilterRegex[2])
})
