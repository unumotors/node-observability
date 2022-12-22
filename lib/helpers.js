function getEnvironment() {
  // APP_ENV takes precedence over NODE_ENV
  const environment = process.env.APP_ENV || process.env.NODE_ENV
  return environment
}

const tracingFilterRegex = [
  /^\/ping[/]*/,
  /^[/]*.*\/-\/(?:readiness|liveness|metrics|ping)[/]*/,
  /^\/api\/v4\/feature_flags\/unleash*/,
]

module.exports = {
  getEnvironment,
  tracingFilterRegex,
}
