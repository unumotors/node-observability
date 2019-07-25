const test = require('ava')
const helpers = require('../../lib/helpers')

test('given no NODE_ENV it defaults to test in unit tests', t => {
  t.is(helpers.getEnvironment({}), 'test')
})

test('given the right env getEnvironment should return the correct results', t => {
  process.env.NODE_ENV = 'node_env'
  t.is(helpers.getEnvironment({}), 'node_env')
  t.is(helpers.getEnvironment({ environment: 'config_env' }), 'config_env')
  process.env.APP_ENV = 'app_env'
  t.is(helpers.getEnvironment({ environment: 'config_env' }), 'app_env')
})


test('given the DD_SERVICE_NAME is configured getServiceName returns that', t => {
  t.is(helpers.getServiceName({}), undefined)

  t.is(helpers.getServiceName({ serviceName: 'configFoo' }), 'configFoo')

  process.env.DD_SERVICE_NAME = 'envFoo'
  t.is(helpers.getServiceName(), 'envFoo')
})

test('given the DD_TRACE_AGENT_HOSTNAME is configured getDDHostName returns that', t => {
  t.is(helpers.getDDHostName(), 'datadog')

  process.env.DD_TRACE_AGENT_HOSTNAME = 'foo.bar'
  t.is(helpers.getDDHostName(), 'foo.bar')
})
