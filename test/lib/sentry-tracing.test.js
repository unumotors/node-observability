// Disable auto init in unit tests
process.env.NODE_ENV = 'not-test-or-development'

const test = require('ava')
const got = require('got')
const http = require('http')
const express = require('express')
const observability = require('../../index')
const { Sentry } = require('../../lib/sentry')
const EventEmitter = require('events')

// emitter for emitting events to the tests
class SentryError extends EventEmitter {}
const sentryEmitter = new SentryError()

const port = 3001

function beforeSend(event) {
  sentryEmitter.emit('event', event)
  return null // Disable sentry error sending for this test
}

observability.init({
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // to figure out default configs
  // debug: true,
  // logLevel: 5,
  tracing: {
    enabled: true,
    host: 'localhost'
    // port: 55678
  },
  unhandledRejection: {
    exitOnError: true
  },
  // do not reference an env variable
  // we need to use the same sentry dsn across envs
  sentry: { // Hard coded on purpose
    dsn: 'https://c71e3c706d914df387610041a232f969@sentry.io/1546792',
    beforeSend
  }
})

const app = express()
const server = http.createServer(app)

app.use((req, res, next) => {
  sentryEmitter.emit('middleware', req)
  next()
})

app.get('/error', (req, res) => {
  Sentry.captureEvent(new Error('testing sentry tracing errors'))
  res.send()
})

observability.monitoring.observeServer(server, app)

test.before(async() => {
  server.listen(port)
  await { then(r, f) { server.on('listening', r); server.on('error', f) } }
})


test.serial('Should add trace id to sentry error and express req', async t => {
  const eventPromise = new Promise((resolve) => {
    sentryEmitter.on('event', (event) => {
      resolve(event)
    })
  })

  const expressMiddlewarePromise = new Promise((resolve) => {
    sentryEmitter.on('middleware', (event) => {
      resolve(event)
    })
  })

  await got.get(`http://localhost:${port}/error`)

  const event = await eventPromise
  const req = await expressMiddlewarePromise

  t.truthy(event.tags.trace_id, 'sentry event should contain trace id tag')
  t.truthy(req.traceId)
  t.is(req.traceId, event.tags.trace_id)
})
