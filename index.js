// Automatically setup and instantiate the libary in testing mode
// This allows users of the lib to not have to setup custom init code them selves
if (process.env.NODE_ENV == 'test') {
  // require base config
  process.env.OBSERVABILITY_SERVICE_NAME = 'unit tests'
}

const Observability = require('./lib/observability')

// Export a static instance method
const instance = new Observability()

// Instantiate with environment variables
instance.init()

module.exports = instance
