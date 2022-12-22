/* eslint-disable class-methods-use-this */
const http = require('http')
const { createTerminus } = require('@godaddy/terminus')
const { promisify } = require('util')
const { Sentry } = require('./sentry')
const metrics = require('./metrics')

class MonitorServer {
  // https://github.com/hunterloftis/stoppable

  // eslint-disable-next-line default-param-last
  constructor(tracing) {
    this.config = {
      enabled: process.env.NODE_ENV != 'test',
      port: process.env.MONITOR_PORT || 9090,
      domainFixEnabled: process.env.MONITOR_DOMAIN_FIX_DISABLED == undefined,
    }
    this.initialized = false
    this.livenessChecks = []
    this.readinessChecks = []
    this.signalHooks = []
    this.observedServers = []
    this.terminus = null
    this.server = null
    this.tracing = tracing
  }

  createServer() {
    const server = http.createServer((request, response) => {
      if (request.url == '/-/metrics') {
        metrics.register.metrics().then((data) => {
          response.writeHead(200, { 'Content-Type': metrics.register.contentType })
          response.write(data)
          response.end()
        })
      } else {
        response.writeHead(200, { 'Content-Type': 'text/plain' })
        response.write(`Monitoring server
        try
        * /-/liveness
        * /-/readiness
        * /-/metrics`)
        response.end()
      }
    })
    return server
  }

  // eslint-disable-next-line require-await
  static async convertListToPromises(checks) {
    const promises = checks.map((i) => {
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
        'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGUSR2', // SIGUSR2 = Nodemon signal
      ],
    }

    options.healthChecks['/-/liveness'] = async() => await MonitorServer.convertListToPromises(this.livenessChecks)

    options.healthChecks['/-/readiness'] = async() => await MonitorServer.convertListToPromises(this.readinessChecks)

    options.onSignal = async() => {
      const promises = MonitorServer.convertListToPromises(this.signalHooks)
      const client = Sentry.getCurrentHub().getClient()
      //wait to send any outstanding errors to sentry
      if (client) {
        promises.push(client.close(2000))
      }

      await Promise.all(promises)
    }

    this.terminus = createTerminus(
      this.server,
      options,
    )
    if (this.config.enabled) {
      this.server.listen(this.config.port)
    }
    return this.terminus
  }

  observeServer(server) {
    this.observedServers.push(server)
    this.addLivenessCheck(() => {
      if (!server.listening) throw new Error('not listening')
    })
    this.addReadinessCheck(() => {
      if (!server.listening) throw new Error('not listening')
    })
    this.addOnSignalHook(() => promisify(server.close.bind(server))())
  }

  /**
   * Add pre-controllers middlewares
   *
   * This function has to be called before adding the controllers
   * to the Express application
   *
   * @param {Object} app The Express application object
   */
  addPreControllersMiddlewares(app) {
    if (this.config.domainFixEnabled && !this.domainFix) {
      // Due to a bug in nodejs a large number of concurrent requests can cause an
      // un-catchable exception. This prevents that
      // Ref: https://github.com/nodejs/node/issues/30122
      // eslint-disable-next-line global-require
      this.domainFix = require('./domain-fix')
    }
    if (!app) {
      throw new Error('express application object is undefined')
    }
    app.use(this.sentryTracingIdMiddleware.bind(this))
    app.use(Sentry.Handlers.requestHandler())
  }

  /**
   * Add post-controllers middlewares
   *
   * This function has to be called right after adding the controllers
   * to the Express application
   *
   * @param {Object} app The Express application object
   */
  addPostControllersMiddlewares(app) {
    if (!app) {
      throw new Error('express application object is undefined')
    }
    // Will automatically create a Sentry alert for all the HTTP errors >500
    app.use(Sentry.Handlers.errorHandler())
  }

  sentryTracingIdMiddleware(req, res, next) {
    if (!this.tracing) return next()

    const traceId = this.tracing.currentTraceId()

    if (traceId) {
      Sentry.configureScope((scope) => {
        scope.setTag('trace_id', traceId)
      })
    }

    next()
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
