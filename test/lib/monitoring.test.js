const test = require('ava')
const request = require('supertest')
const MonitorServer = require('../../lib/monitoring')

test('Should return a object', t => {
  t.truthy(MonitorServer)
})


test('Have a metrics endpoint', async t => {
  const monitor = new MonitorServer()
  const server = monitor.createServer()
  t.plan(2)
  const res = await request(server)
    .get('/-/metrics').expect('Content-Type', /text\/plain/)

  t.is(res.status, 200)
  t.is(res.text, '')
})

test('Should allow init and then close', async t => {
  const monitor = new MonitorServer()
  // just to make sure we can init and close safely
  monitor.init()
  monitor.close()
  t.pass()
})

test('Should give help info on /', async t => {
  const monitor = new MonitorServer()
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

test('Add liveness checks should work', async t => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addLivenessCheck(async() => {})
  monitor.addLivenessCheck(() => {})
  t.is(monitor.livenessChecks.length, 2)
})

test('Add readiness checks should work', async t => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addReadinessCheck(async() => {})
  monitor.addReadinessCheck(() => {})

  t.is(monitor.readinessChecks.length, 2)
})

test('Add addOnSignalHook checks should work', async t => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addOnSignalHook(async() => {})
  monitor.addOnSignalHook(() => {})

  t.is(monitor.signalHooks.length, 2)
})

test('convert list of functions to promises with an error', async t => {
  t.plan(1)
  const f = async() => {
    throw new Error('should be rejected')
  }
  const g = async() => {}
  const list = [f, g]

  await MonitorServer.convertListToPromises(list).catch(err => t.is(err.message, 'should be rejected'))
})

test('convert list of functions to promises', async t => {
  t.plan(1)
  const f = async() => {
  }
  const g = async() => {}
  const list = [f, g]

  const promises = await MonitorServer.convertListToPromises(list)
  t.is(promises.length, 2)
})


test('bindHttpServer correctly adds checks', t => {
  const server = {
    listening: false
  }

  const monitor = new MonitorServer()
  t.is(monitor.boundServer, null)
  monitor.bindHttpServer(server)
  t.is(monitor.livenessChecks.length, 1)
  t.is(monitor.readinessChecks.length, 1)
  t.is(monitor.boundServer, server)

  try {
    monitor.readinessChecks[0]()
    t.fail()
  } catch (err) {
    t.is(err.message, 'not listening')
  }

  try {
    monitor.livenessChecks[0]()
    t.fail()
  } catch (err) {
    t.is(err.message, 'not listening')
  }

  // These should work after setting server as listening
  server.listening = true

  monitor.readinessChecks[0]()
  monitor.livenessChecks[0]()
})
