const { init: monitoring } = require('./lib/monitoring')
const { init: unhandledPromise } = require('./lib/unhandled-promise')
const { promisify } = require('util')
unhandledPromise()
monitoring()
// {
//   onSignal: () => promisify(server.close),
//   liveness: async () =>{
//     if (!server.listening) throw new Error() // Express http server is listening
//   },
//   readiness: async() => {
//     if (!server.listening) throw new Error() // Express http server is listening
//     if (mongoose.connection.readyState != 1) throw new Error() // Mongoose connection stable
//   }
// }
