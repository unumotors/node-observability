const http = require('http')
const Sentry = require('./sentry')
const { register, Gauge, Counter} = require('prom-client')
const { createTerminus } = require('@godaddy/terminus');



//// Server
// Defaults to 9090 and this should NOT be changed (its promethues port
// but we wont run our applications on the same interface)
// This allows us to standardise things
const init = function(config = {}) {
  const server = http.createServer((request, response) => {
    if(request.url == '/-/metrics'){
      response.end(register.metrics())
    } else {
      response.end(
        `Monitoring server
        try
        * /-/liveness
        * /-/readiness
        * /-/metrics`
      );
    }
  })

  const { onSignal, liveness, readiness } = config
  let options = {
    healthChecks: {},
    signals: [
      'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGUSR2' // SIGUSR2 = Nodemon signal
    ]
  }

  options.healthChecks['/-/liveness'] = liveness || function(){}
  options.healthChecks['/-/readiness'] = readiness || function(){}
  options.onSignal = function(){
    let client = Sentry.getCurrentHub().getClient();
    if (client) {
      client.close(2000).then(function() {
        process.exit();
      });
    }
    onSignal()
  }

  const term =  createTerminus(
    server,
    options
  )
  server.listen(process.env.MONITORING_PORT ||9090);
  return term
}

module.exports = { init }
