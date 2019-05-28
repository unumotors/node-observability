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
    this.onSignalHooks = []
    this.httpServer = null
    this.terminus = null
    this.server = null
  }

  createServer() {
    this.server = http.createServer((request, response) => {
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
    return this.server
  }

  //// Server
  // Defaults to 9090 and this should NOT be changed (its promethues port
  // but we wont run our applications on the same interface)
  // This allows us to standardise things
  init() {
    this.server = this.createServer()

    let options = {
      healthChecks: {},
      signals: [
        'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGUSR2' // SIGUSR2 = Nodemon signal
      ]
    }

    options.healthChecks['/-/liveness'] = async function() {
      let promises
      promises = this.livenessChecks.map(i => {
        // with out this it triggers unhandled promises
        try {
          return i()
        } catch (err) {
          return Promise.reject(err)
        }
      })
      await Promise.all(promises)
    }

    options.healthChecks['/-/readiness'] = async function() {
      let promises
      promises = this.livenessChecks.map(i => {
        // with out this it triggers unhandled promises
        try {
          return i()
        } catch (err) {
          return Promise.reject(err)
        }
      })
      await Promise.all(promises)
    }

    options.onSignal = async function() {
      let promises
      promises = this.onSignalHooks.map(i => {
        // with out this it triggers unhandled promises
        try {
          return i()
        } catch (err) {
          return Promise.reject(err)
        }
      })
      let client = Sentry.getCurrentHub().getClient()
      //wait to send any outstanding errors to sentry
      if (client) {
        promises.push(client.close(2000))
      }
      // close the parent server
      if (this.httpServer) {
        promises.push(promisify(this.httpServer.close.bind(this.httpServer))())
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

  bindHttpServer(server) {
    this.httpServer = server
    this.addLivenessCheck(() => {
      if (!this.httpServer.listening) throw new Error('not listening')
      return Promise.resolve()
    })
    this.addReadinessCheck(() => {
      if (!this.httpServer.listening) throw new Error('not listening')
      return Promise.resolve()
    })
  }

  close() {
    this.server.close()
  }

  addLivenessCheck(check) {
    // var isPromise = typeof check().then == 'function'
    // if (!isPromise) {
    //   throw new Error('Required function to return a promise')
    // }
    this.livenessChecks.push(check)
  }

  addReadinessCheck(check) {
    // var isPromise = typeof check().then == 'function'
    // if (!isPromise) {
    //   throw new Error('Required function to return a promise')
    // }
    this.readinessChecks.push(check)
  }

  addOnSignalHook(hook) {
    // var isPromise = typeof hook().then == 'function'
    // if (!isPromise) {
    //   throw new Error('Required function to return a promise')
    // }
    this.onSignalHooks.push(hook)
  }
}

const mon = new MonitorServer()

module.exports = mon
