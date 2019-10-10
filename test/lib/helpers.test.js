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
