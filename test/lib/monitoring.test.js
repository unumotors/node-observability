const test = require('ava')
const request = require('supertest')
const monitor = require('../../lib/monitoring')

test('Should return a object', t => {
  t.truthy(monitor)
})


test('Have a metrics endpoint', async t => {
  const server = monitor.createServer()
  t.plan(2)
  const res = await request(server)
    .get('/-/metrics').expect('Content-Type', /text\/plain/)

  t.is(res.status, 200)
  t.is(res.text, '')
})


test('Should give help info on /', async t => {
  const server = monitor.createServer()
  t.plan(4)
  const res = await request(server)
    .get('/').expect('Content-Type', /text\/plain/)

  t.is(res.status, 200)
  // Give urls for each endpoint
  t.regex(res.text, /\/-\/metrics/)
  t.regex(res.text, /\/-\/liveness/)
  t.regex(res.text, /\/-\/readiness/)
})
