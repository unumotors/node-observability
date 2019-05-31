// Allow globally setting the Datadog service name
// but still allow overiding in env's
// No way to easily pass functions/config to init
// As this needs to be the first lin
const observability = require('../../index').init({
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // This allows us to wait for the http server
  monitoring: {
    externalHttp: true
  },
  // This is the default
  // unhandledRejection: {
  //   exitOnError: true
  // },
  sentry: {
    // dsn: 'https://foo.com'
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
observability.monitoring.bindHttpServer(server)


setTimeout(function() {
  console.log('starting to listen')
  server.listen(3000)
  //connectedGauge.set(1)
}, 3000)
