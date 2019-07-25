const test = require('ava')

const Observability = require('../lib/observability')

test('given the development env it should correctly setup the singleton', t => {
  process.env.NODE_ENV = 'development'
  delete require.cache[require.resolve('../index')]
  // eslint-disable-next-line global-require
  const observability = require('../index')
  t.true(observability instanceof Observability)
  t.false(observability.initialized)
})

test('given the test env it should correctly setup the singleton', t => {
  process.env.NODE_ENV = 'test'
  delete require.cache[require.resolve('../index')]
  // eslint-disable-next-line global-require
  const observability = require('../index')
  t.true(observability instanceof Observability)
  // We auto init libs in testing
  t.true(observability.initialized)
})
