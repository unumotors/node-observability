const helpers = require('./helpers')
// These 2 lines must come before importing any instrumented module.
// this is ok because helpers doesn't require any modules
const tracer = require('dd-trace')


function init(config) {
  // We can't export an init function because then it could be inited after required modules
  // We need to rely on the DD_SERVICE_NAME env variable
  tracer.init({
    service: helpers.getServiceName(config),
    env: helpers.getEnvironment(config),
    hostname: helpers.getDDHostName()
  })
}

module.exports = { tracer, init }
