const init = function(config = {}) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason)
    // We still need to better handle this.
    // sentry
    // Application specific logging, throwing an error, or other logic here
    process.exit(1)
  })
}

module.exports = { init }
