/* eslint-disable no-await-in-loop */
// Enable extensive mongo tracing
process.env.TRACING_CAPTURE_MONGO_QUERIES_ENABLED = true
process.env.OBSERVABILITY_SERVICE_NAME = 'david-observability-run-server'
process.env.TRACING_ENABLED = true
process.env.TRACING_URI = 'http://localhost:4318/v1/traces'
process.env.TRACING_DEBUG = true

const { fork } = require('child_process')
// eslint-disable-next-line import/order
const observability = require('../../index')

const http = require('http')
const express = require('express')

const app = express()
const server = http.createServer(app)

// Adds shutdown handlers, liveness checks, and sentry to express
// observeServer must be come before any other middleware in the app
observability.monitoring.observeServer(server, app)

function getGoogleSearchResults() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.google.com',
      port: 80,
      path: '/search?q=unu',
      method: 'GET',
    }

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        resolve(data)
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

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
  const response = await getGoogleSearchResults()
  res.send(response)
})

async function doRequests() {
  // We need to spawn this so tracing does not monitor got http requests
  const compute = fork('get.js')
  compute.send('start')
  await new Promise((res) => {
    compute.on('close', () => {
      res()
    })
  })
}

setTimeout(async() => {
  console.log('starting to listen')
  server.listen(3000)
  await doRequests()
  console.log('Open http://localhost:3000 and browse around then')
  console.log('Go to http://localhost:16686 and validate the existing traces (see README.md in test/helpers)')
}, 1000)
