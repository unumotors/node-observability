// By default if you include sentry the default unhandledRejection handler
// Doesn't fire so you loose visibility
// https://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html

class UnhandledRejection {
  init(config = {}) {
    // null op exit function
    this.exitFunction = () => {}
    // Override to default exit with error code
    if (config.exitOnError === undefined || config.exitOnError) {
      this.exitFunction = process.exit
    }

    // Has to be in a fat arrow function so we can call this internally
    process.on('unhandledRejection', (error) => this.rejectionHandler(error))
  }

  rejectionHandler(err) {
    console.warn('UnhandledPromiseRejectionWarning: Error:', err.message, err)
    // TODO exit gracefully (send events to sentry and such)
    this.exitFunction(1)
  }
}

module.exports = UnhandledRejection
