const http = require('http')
const { Sentry } = require('./sentry')
const metrics = require('./metrics')
const { createTerminus } = require('@godaddy/terminus')
const { promisify } = require('util')

class MonitorServer {
  // https://github.com/hunterloftis/stoppable

  constructor() {
    this.initialized = false
    this.livenessChecks = []
    this.readinessChecks = []
    this.signalHooks = []
    this.observedServer = null
    this.terminus = null
    this.server = null
  }

  createServer() {
    const server = http.createServer((request, response) => {
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

  static async convertListToPromises(checks) {
    let promises = checks.map(i => {
      // with out this it triggers unhandled promises
      // this allows us to throw Error or return a rejected
      try {
        return i()
      } catch (err) {
        return Promise.reject(err)
      }
    })
    return Promise.all(promises)
  }

  //// Server
  // Defaults to 9090 and this should NOT be changed (its promethues port
  // but we wont run our applications on the same interface)
  // This allows us to standardise things
  init() {
    this.server = this.createServer()

    const options = {
      healthChecks: {},
      signals: [
        'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGUSR2' // SIGUSR2 = Nodemon signal
      ]
    }

    options.healthChecks['/-/liveness'] = async() => MonitorServer.convertListToPromises(this.livenessChecks)

    options.healthChecks['/-/readiness'] = async() => MonitorServer.convertListToPromises(this.readinessChecks)

    options.onSignal = async() => {
      let promises = MonitorServer.convertListToPromises(this.signalHooks)
      let client = Sentry.getCurrentHub().getClient()
      //wait to send any outstanding errors to sentry
      if (client) {
        promises.push(client.close(2000))
      }

      await Promise.all(promises)
    }

    this.terminus = createTerminus(
      this.server,
      options
    )
    this.server.listen(process.env.MONITORING_PORT || 9090)
    return this.terminus
  }

  observeServer(server, app = null) {
    this.observedServer = server
    this.addLivenessCheck(() => {
      if (!this.observedServer.listening) throw new Error('not listening')
    })
    this.addReadinessCheck(() => {
      if (!this.observedServer.listening) throw new Error('not listening')
    })
    this.addOnSignalHook(() => promisify(this.observedServer.close.bind(this.observedServer))())

    // Automatically install sentry if express app is present
    if (app) {
      app.use(Sentry.Handlers.requestHandler())
    }
  }

  close() {
    this.server.close()
  }

  addLivenessCheck(check) {
    this.livenessChecks.push(check)
  }

  addReadinessCheck(check) {
    this.readinessChecks.push(check)
  }

  addOnSignalHook(hook) {
    this.signalHooks.push(hook)
  }
}

module.exports = MonitorServer
