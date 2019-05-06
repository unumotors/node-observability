// Allow globally setting the Datadog service name
// but still allow overiding in env's
// No way to easily pass functions/config to init
// As this needs to be the first lin
require('../../index').init({
  // Globally configured service name
  // DO NOT prefix by env
  serviceName: 'david-observability-run-server',
  // This allows us to wait for the http server
  monitoring: {
    externalHttp: true
  },
  sentry: {
    // dsn: 'https://foo.com'
  }
})

const observability = require('../../index')
// Liveness check based on if connected to slack or not
// Delay check.
// `connectedGauge` will be null and throw an error until its ready
observability.monitoring.addLivenessCheck(() => {
  // get returns hash in format
  // values: [ { value: 0, labels: {}, timestamp: undefined } ]
  // piggyback off existing metrics (these are then saved to prometheus)
  if (connectedGauge.get().values[0].value != 1) {
    throw new Error('Server not running')
  }
})

// Slack
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
  connectedGauge.set(1)
}, 3000)
