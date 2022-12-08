const test = require('ava')
const promClient = require('prom-client')
const metrics = require('../../lib/metrics')

test('Should report same metrics client as prom-client', (t) => {
  t.is(metrics, promClient)
})
