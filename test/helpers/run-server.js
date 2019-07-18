// Allow globally setting the Datadog service name
// but still allow overiding in env's
// No way to easily pass functions/config to init
// As this needs to be the first lin
const observability = require('../../index').init({
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // This is the default
  // unhandledRejection: {
  //   exitOnError: true
  // },
  // do not reference an env varibale
  // we need to use the same sentry dsn accross envs
  sentry: {
    // dsn: 'https://na@sentry.com/adf'
  }
})

// This verifies unhandled promises print error messages
// and exit
// async function moo (){
//   const foo = require("foo/vbar")
// }
// moo()

let failCheck = false
// Liveness check based on if connected to slack or not
// Delay check.
observability.monitoring.addLivenessCheck(async() => {
  if (failCheck) {
    console.log('failed')
    throw new Error('foo')
  }
})

observability.monitoring.addOnSignalHook(async() => {
  console.log('Shutting down')
})

// // Slack
const connectedGauge = new observability.metrics.Gauge({ name: 'connected', help: 'If server is up' })
connectedGauge.set(0)

const http = require('http')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.send('ok')
})

const server = http.createServer(app)
// Adds shutdown handlers, liveness checks, and sentry to express
observability.monitoring.observeServer(server, app)


setTimeout(function() {
  console.log('starting to listen')
  server.listen(3000)
  connectedGauge.set(1)
}, 3000)
