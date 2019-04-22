const { init: monitoring } = require('./lib/monitoring')
const { init: unhandledPromise } = require('./lib/unhandled-promise')
unhandledPromise()
monitoring()


