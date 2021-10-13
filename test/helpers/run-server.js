/* eslint-disable no-await-in-loop */
// Enable extensive mongo tracing
process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED = true

const observability = require('../../index').init({
  serviceName: 'david-observability-run-server',
  tracing: {
    enabled: true,
    uri: 'http://localhost:55681/v1/trace'
  },
  sentry: {
  }
})
const { fork } = require('child_process')

const http = require('http')
const express = require('express')

const app = express()
const server = http.createServer(app)

// Adds shutdown handlers, liveness checks, and sentry to express
// observeServer must be come before any other middleware in the app
observability.monitoring.observeServer(server, app)

app.get('/-/readiness', (req, res) => {
  res.send()
})
app.get('/-/liveness', (req, res) => {
  res.send()
})
app.get('/-/ping', (req, res) => {
  res.send()
})
app.get('/ping', (req, res) => {
  res.send()
})

app.get('/', async(req, res) => {
  res.send('hello')
})

async function doRequests() {
  // We need to spawn this so tracing does not monitor got http requests
  const compute = fork('get.js')
  compute.send('start')
  await new Promise(res => {
    compute.on('close', () => {
      res()
    })
  })
}

setTimeout(async() => {
  console.log('starting to listen')
  server.listen(3000)
  await doRequests()
  console.log(`Go to http://localhost:16686 and validate the existing traces (see README.md in test/helpers)`)
}, 1000)
