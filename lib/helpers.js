function getEnvironment(config) {
  // APP_ENV takes precedence over NODE_ENV
  const environment = process.env.APP_ENV || config.environment || process.env.NODE_ENV
  return environment
}

const tracingFilterRegex = [
  /^\/ping[/]*/,
  /^[/]*.*\/-\/(?:readiness|liveness|metrics|ping)[/]*/
]

module.exports = {
  getEnvironment,
  tracingFilterRegex
}
