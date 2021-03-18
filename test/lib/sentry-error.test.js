// Disable auto init in unit tests
process.env.NODE_ENV = 'not-test-or-development'

const test = require('ava')
const http = require('http')
const request = require('supertest')
const express = require('express')
const MonitorServer = require('../../lib/monitoring')
const sentry = require('../../lib/sentry')
const createError = require('http-errors')
const EventEmitter = require('events')

const emitter = new EventEmitter()

test.serial('Should create a Sentry alert if HTTP response code is 5xx', async t => {
  const beforeSend = (event) => {
    emitter.emit('event', event)
    return null // Disable sending Sentry error
  }

  sentry.init({
    dsn: 'https://na@sentry.io/1234',
    beforeSend
  })

  const app = express()
  const server = http.createServer(app)

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  monitor.addPreControllersMiddlewares(app)
  app.get('/5xx', (req, res, next) => {
    next(createError(500, 'This should be in the Sentry alert'))
  })
  monitor.addPostControllersMiddlewares(app)

  // Listen on a random port
  server.listen(0)
  await { then(r, f) { server.on('listening', r); server.on('error', f) } }

  const eventPromise = new Promise((resolve) => {
    emitter.on('event', (event) => {
      resolve(event)
    })
  })
  const res = await request(server).get('/5xx').expect(500)
  const event = await eventPromise

  server.close()

  t.is(res.statusCode, 500)
  t.is(event.exception.values[0].value, 'This should be in the Sentry alert')
})

test.serial('Should not create a Sentry alert if HTTP response code is 4xx', async t => {
  const beforeSend = () => {
    t.fail()
    return null // Disable sending Sentry error
  }

  sentry.init({
    dsn: 'https://na@sentry.io/1234',
    beforeSend
  })

  const app = express()
  const server = http.createServer(app)

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  monitor.addPreControllersMiddlewares(app)
  app.get('/4xx', (req, res, next) => {
    next(createError(404, 'This should not be in the Sentry alert'))
  })
  monitor.addPostControllersMiddlewares(app)

  // Listen on a random port
  server.listen(0)
  await { then(r, f) { server.on('listening', r); server.on('error', f) } }

  const res = await request(server).get('/4xx').expect(404)

  server.close()

  t.is(res.statusCode, 404)
})

test.serial('Should not create a Sentry alert if Sentry handler before routes', async t => {
  const beforeSend = () => {
    t.fail()
    return null // Disable sending Sentry error
  }

  sentry.init({
    dsn: 'https://na@sentry.io/1234',
    beforeSend
  })

  const app = express()
  const server = http.createServer(app)

  const monitor = new MonitorServer()
  monitor.observeServer(server)
  monitor.addPreControllersMiddlewares(app)
  monitor.addPostControllersMiddlewares(app)
  app.get('/5xx', (req, res, next) => {
    next(createError(500, 'InternalServerError'))
  })

  // Listen on a random port
  server.listen(0)
  await { then(r, f) { server.on('listening', r); server.on('error', f) } }

  const res = await request(server).get('/5xx').expect(500)

  server.close()

  t.is(res.statusCode, 500)
})
