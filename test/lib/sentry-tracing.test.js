/* eslint-disable no-promise-executor-return */
// Disable auto init in unit tests
process.env.NODE_ENV = 'not-test-or-development'
process.env.OBSERVABILITY_SERVICE_NAME = 'david-observability-run-server'
process.env.TRACING_ENABLED = true
process.env.TRACING_URI = 'localhost'
// do not reference an env variable
// we need to use the same sentry dsn across envs
process.env.SENTRY_DSN = 'https://c71e3c706d914df387610041a232f969@sentry.io/1546792'
process.env.UNHANDLED_REJECTION_EXIT_ON_ERROR_DISABLED = true

const test = require('ava')
const got = require('got')
const http = require('http')
const express = require('express')
const EventEmitter = require('events')
const { spawn } = require('child_process')
const Observability = require('../../lib/observability')
const { Sentry } = require('../../lib/sentry')

// emitter for emitting events to the tests
class SentryError extends EventEmitter {}
const sentryEmitter = new SentryError()

const port = 3001

function beforeSend(event) {
  sentryEmitter.emit('event', event)
  return null // Disable sentry error sending for this test
}

// beforeSend needs to be manually set because we don't allow
// passing this in with the init config
const observability = new Observability().init({
  sentry: {
    beforeSend,
  },
})

const app = express()
const server = http.createServer(app)

observability.monitoring.observeServer(server)

app.use((req, res, next) => {
  sentryEmitter.emit('middleware', req)
  next()
})

observability.monitoring.addPreControllersMiddlewares(app)

app.get('/error', (req, res) => {
  Sentry.captureEvent(new Error('testing sentry tracing errors'))
  res.send()
})

app.get('/success', (req, res) => {
  res.send('OK')
})

observability.monitoring.addPostControllersMiddlewares(app)

test.before(async() => {
  server.listen(port)
  await { then(r, f) { server.on('listening', r); server.on('error', f) } }
  await new Promise((resolve1) => setTimeout(resolve1, 2000)) // wait for tracing
})

test.serial('Should add trace ids to sentry errors', async(t) => {
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
  await expressMiddlewarePromise

  t.truthy(event.tags.trace_id, 'sentry event should contain trace id tag')
})

test.serial('Can still do http requests from clients without tracing enabled', async(t) => {
  const process = spawn('node', ['test/helpers/get-localhost.js'])
  process.stdout.on('data', (data) => {
    t.is(Number(`${data}`), 200)
  })

  process.stderr.on('data', () => {
    t.fail('should have not gotten here')
  })

  await new Promise((resolve) => {
    process.on('exit', (code, signal) => {
      console.log('child process exited with '
                  + `code ${code} and signal ${signal}`)
      resolve()
    })
  })
})
