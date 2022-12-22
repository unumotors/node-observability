const test = require('ava')
const request = require('supertest')
const express = require('express')
const http = require('http')
const sinon = require('sinon')
const MonitorServer = require('../../lib/monitoring')

// Create a sinon sandbox which automatically gets restored between tests
test.beforeEach((t) => {
  t.context.sinon = sinon.createSandbox()
})

test.afterEach((t) => {
  t.context.sinon.restore()
})

test('Should return a object', (t) => {
  t.truthy(MonitorServer)
})

test('Should init with default values', (t) => {
  // this is the default but lets be explicit
  process.env.NODE_ENV = 'test'
  let monitor = new MonitorServer()
  t.is(monitor.config.port, 9090)
  // false in unit tests
  t.is(monitor.config.enabled, false)

  process.env.NODE_ENV = 'development'
  monitor = new MonitorServer()
  // enabled for any thing other than test
  t.is(monitor.config.enabled, true)
  process.env.MONITOR_PORT = 4532
  monitor = new MonitorServer()
  // enabled for any thing other than test
  t.is(monitor.config.port, '4532')
  delete process.env.MONITOR_PORT
})

test('Have a metrics endpoint', async(t) => {
  const monitor = new MonitorServer()
  const server = monitor.createServer()
  t.plan(2)
  const res = await request(server)
    .get('/-/metrics').expect('Content-Type', /text\/plain/)

  t.is(res.status, 200)
  t.is(res.text, '\n')
})

test('Should allow init and then close', (t) => {
  const monitor = new MonitorServer()
  // just to make sure we can init and close safely
  monitor.init()
  monitor.close()
  t.pass()
})

test('given the unit tests we should not open the port for monitoring server', (t) => {
  process.env.NODE_ENV = 'test'
  const monitor = new MonitorServer()
  const server = http.createServer()
  server.listen = () => t.fail('should not call listen in NODE_ENV=test')
  monitor.createServer = () => server
  // just to make sure we can init and close safely
  monitor.init()
  t.pass()
})

test('given development env we should start listening on default port', (t) => {
  t.plan(1)
  process.env.NODE_ENV = 'development'
  const monitor = new MonitorServer()
  const server = http.createServer()
  server.listen = (port) => t.is(port, 9090)
  monitor.createServer = () => server
  // just to make sure we can init and close safely
  monitor.init()
})

test('given production env we should start listening on default port', (t) => {
  t.plan(1)
  process.env.NODE_ENV = 'production'
  const monitor = new MonitorServer()
  const server = http.createServer()
  server.listen = (port) => t.is(port, 9090)
  monitor.createServer = () => server
  // just to make sure we can init and close safely
  monitor.init()
})

test('Should give help info on /', async(t) => {
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

test('Add liveness checks should work', (t) => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addLivenessCheck(async() => {})
  monitor.addLivenessCheck(() => {})
  t.is(monitor.livenessChecks.length, 2)
})

test('Add readiness checks should work', (t) => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addReadinessCheck(async() => {})
  monitor.addReadinessCheck(() => {})

  t.is(monitor.readinessChecks.length, 2)
})

test('Add addOnSignalHook checks should work', (t) => {
  t.plan(1)
  const monitor = new MonitorServer()
  monitor.addOnSignalHook(async() => {})
  monitor.addOnSignalHook(() => {})

  t.is(monitor.signalHooks.length, 2)
})

test('convert list of functions to promises with an error for async', async(t) => {
  t.plan(1)
  // eslint-disable-next-line require-await
  const f = async() => {
    throw new Error('should be rejected')
  }
  const list = [f]

  await MonitorServer.convertListToPromises(list).catch((err) => t.is(err.message, 'should be rejected'))
})

test('convert list of functions to promises with an error', async(t) => {
  t.plan(1)
  const f = () => {
    throw new Error('should be rejected')
  }
  const list = [f]
  await MonitorServer.convertListToPromises(list).catch((err) => t.is(err.message, 'should be rejected'))
})

test('convert list of functions to promises', async(t) => {
  t.plan(1)
  const f = async() => {
  }
  const g = async() => {}
  const list = [f, g]

  const promises = await MonitorServer.convertListToPromises(list)
  t.is(promises.length, 2)
})

test('observeServer correctly adds checks', (t) => {
  const server = {
    listening: false,
  }

  const monitor = new MonitorServer()
  t.deepEqual(monitor.observedServers, [])
  monitor.observeServer(server)
  t.is(monitor.livenessChecks.length, 1)
  t.is(monitor.readinessChecks.length, 1)
  t.is(monitor.observedServers[0], server)

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

test('addPreControllersMiddlewares correctly adds middlewares for Express app', (t) => {
  const server = {
    listening: false,
  }

  let count = 0

  const app = {
    use: (requestHandler) => {
      t.truthy(requestHandler)
      count += 1
    },
  }

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  t.is(monitor.domainFix, undefined)
  monitor.addPreControllersMiddlewares(app)
  t.is(typeof monitor.domainFix.strongReferences, 'object', 'should initiate domain hack')
  t.is(monitor.observedServers[0], server)
  // Verify we call app.use for tracing id and request handler
  t.is(count, 2)
})

test('addPreControllersMiddlewares throws if Express app is undefined', (t) => {
  const server = {
    listening: false,
  }

  const monitor = new MonitorServer()
  monitor.observeServer(server)

  const err = t.throws(() => {
    monitor.addPreControllersMiddlewares(undefined)
  }, { instanceOf: Error })

  t.is(err.message, 'express application object is undefined')
})

test('addPostControllersMiddlewares correctly adds middlewares for Express app', (t) => {
  const server = {
    listening: false,
  }

  let count = 0

  const app = {
    use: (requestHandler) => {
      t.truthy(requestHandler)
      count += 1
    },
  }

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  monitor.addPostControllersMiddlewares(app)
  t.is(monitor.observedServers[0], server)
  // Verify we call app.use for tracing id and request handler
  t.is(count, 1)
})

test('addPostControllersMiddlewares throws if Express app is undefined', (t) => {
  const server = {
    listening: false,
  }

  const monitor = new MonitorServer()
  monitor.observeServer(server)

  const err = t.throws(() => {
    monitor.addPostControllersMiddlewares(undefined)
  }, { instanceOf: Error })

  t.is(err.message, 'express application object is undefined')
})

test('observeServer can be called after middleware has been added', (t) => {
  const server = {
    listening: false,
  }

  const app = express()
  app.use(() => {})

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  // eslint-disable-next-line no-underscore-dangle
  t.is(app._router.stack.length, 3)
})
