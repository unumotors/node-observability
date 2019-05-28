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

  async convertListToPromises(checks) {
    console.log(checks)
    let promises = checks.map(i => {
      // with out this it triggers unhandled promises
      try {
        return i()
      } catch (err) {
        return Promise.reject(err)
      }
    })
    console.log(promises)
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

    options.healthChecks['/-/liveness'] = async() => this.convertListToPromises(this.livenessChecks)

    options.healthChecks['/-/readiness'] = async() => this.convertListToPromises(this.readinessChecks)

    const that = this
    options.onSignal = async function() {
      console.log('signal handling')
      try{
      console.log(that.onSignalHooks)
      }catch(err){
        console.log(err)
      }
      console.log('aft')
      let promises = that.convertListToPromises(that.onSignalHooks)
      console.log(promises)
      let client = Sentry.getCurrentHub().getClient()
      //wait to send any outstanding errors to sentry
      if (client) {
        promises.push(client.close(2000))
      }
      // close the bound server
      if (that.httpServer) {
        promises.push(promisify(that.httpServer.close.bind(that.httpServer))())
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
    })
    this.addReadinessCheck(() => {
      if (!this.httpServer.listening) throw new Error('not listening')
    })
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
    this.onSignalHooks.push(hook)
  }
}

const mon = new MonitorServer()

module.exports = mon
