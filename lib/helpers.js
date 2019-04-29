function getEnvironment(config) {
  // APP_ENV takes precedence over NODE_ENV
  const environment = process.env.APP_ENV || config.environment || process.env.NODE_ENV
  return environment
}

module.exports = {
  getEnvironment
}
