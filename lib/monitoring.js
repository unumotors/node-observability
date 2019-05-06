const http = require('http')
const { Sentry } = require('./sentry')
const metrics = require('prom-client')
const { createTerminus } = require('@godaddy/terminus')

const livenessChecks = []
const readinessChecks = []

let httpServer = null

let terminus
let server


//// Server
// Defaults to 9090 and this should NOT be changed (its promethues port
// but we wont run our applications on the same interface)
// This allows us to standardise things
const init = function() {
  server = http.createServer((request, response) => {
    if (request.url == '/-/metrics') {
      response.end(metrics.register.metrics())
    } else {
      response.end(`Monitoring server
        try
        * /-/liveness
        * /-/readiness
        * /-/metrics`)
    }
  })

  let options = {
    healthChecks: {},
    signals: [
      'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGUSR2' // SIGUSR2 = Nodemon signal
    ]
  }

  options.healthChecks['/-/liveness'] = async function() {
    for (const item of livenessChecks) {
      // eslint-disable-next-line no-await-in-loop
      await item()
    }
  }

  options.healthChecks['/-/readiness'] = async function() {
    for (const item of readinessChecks) {
      // eslint-disable-next-line no-await-in-loop
      await item()
    }
  }

  options.onSignal = function() {
    //todo put in promise.all and figure this magic out
    let client = Sentry.getCurrentHub().getClient()
    if (client) {
      client.close(2000).then(function() {
        process.exit()
      })
    }
    if (httpServer) {
      console.log('closing http connections')
      httpServer.close(() => {
        console.log('http server closed')
      })
    }
  }

  terminus = createTerminus(
    server,
    options
  )
  server.listen(process.env.MONITORING_PORT || 9090)
  return terminus
}

function bindHttpServer(server) {
  httpServer = server
  addLivenessCheck(async() => {
    if (!httpServer.listening) throw new Error()
  })
  addReadinessCheck(async() => {
    if (!httpServer.listening) throw new Error()
  })
}

function close() {
  server.close()
}

function addLivenessCheck(check) {
  livenessChecks.push(check)
}

function addReadinessCheck(check) {
  readinessChecks.push(check)
}

module.exports = {
  init,
  addLivenessCheck,
  addReadinessCheck,
  bindHttpServer,
  metrics,
  close
}
