function getEnvironment(config) {
  // APP_ENV takes precedence over NODE_ENV
  const environment = process.env.APP_ENV || config.environment || process.env.NODE_ENV
  return environment
}

function getServiceName(config) {
  const name = process.env.DD_SERVICE_NAME || config.serviceName
  return name
}

function getDDHostName() {
  const name = process.env.DD_TRACE_AGENT_HOSTNAME || 'datadog'
  return name
}

module.exports = {
  getEnvironment,
  getServiceName,
  getDDHostName
}
