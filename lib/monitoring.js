const http = require('http')
const { Sentry } = require('./sentry')
const metrics = require('./metrics')
const { createTerminus } = require('@godaddy/terminus')
const { promisify } = require('util')

const livenessChecks = []
const readinessChecks = []

let httpServer = null

let terminus
let server

const createServer = function() {
  let server = http.createServer((request, response) => {
    if (request.url == '/-/metrics') {
      response.writeHead(200, { 'Content-Type': metrics.register.contentType })
      response.end(metrics.register.metrics())
    } else {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end(`Monitoring server
        try
        * /-/liveness
        * /-/readiness
        * /-/metrics`)
    }
  })
  return server
}


//// Server
// Defaults to 9090 and this should NOT be changed (its promethues port
// but we wont run our applications on the same interface)
// This allows us to standardise things
const init = function() {
  server = createServer()

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

  options.onSignal = async function() {
    let promises = []
    let client = Sentry.getCurrentHub().getClient()
    //wait to send any outstanding errors to sentry
    if (client) {
      promises.push(client.close(2000))
    }
    if (httpServer) {
      promises.push(promisify(httpServer.close)())
    }
    await Promise.all(promises)
    console.log('closed all connections')
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
  createServer,
  init,
  addLivenessCheck,
  addReadinessCheck,
  bindHttpServer,
  close
}
