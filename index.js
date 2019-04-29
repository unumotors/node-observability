const monitoring = require('./lib/monitoring')
const { init: initSentry, Sentry } = require('./lib/sentry')

// {
// const { promisify } = require('util')
//   onSignal: () => promisify(server.close),
//   liveness: async () =>{
//     if (!server.listening) throw new Error() // Express http server is listening
//   },
//   readiness: async() => {
//     if (!server.listening) throw new Error() // Express http server is listening
//     if (mongoose.connection.readyState != 1) throw new Error() // Mongoose connection stable
//   }
// }

async function init(config = {}) {
  initSentry(config.sentry)
  monitoring.init(config.monitoring)
}


module.exports = { Sentry, init, monitoring }
