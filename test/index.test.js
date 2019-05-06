const test = require('ava')
const observability = require('../index')
const Observability = require('../lib/observability')

test('Should return a singleton instance of Observability', t => {
  t.true(observability instanceof Observability)
})
