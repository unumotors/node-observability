// By default if you include sentry the default unhandledRejection handler
// Doesn't fire so you loose visibility
// https://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html

class UnhandledRejection {
  init(config = {}) {
    // null op exit function
    this.exitFunction = () => {}
    if (config.exitOnError === undefined || config.exitOnError) {
      this.exitFunction = process.exit
    }

    const that = this
    process.on('unhandledRejection', function(err) {
      console.log('UnhandledPromiseRejectionWarning: Error:', err.message, err)
      // TODO exit gracefully (send events to sentry and such)
      that.exitFunction(1)
    })
  }
}

module.exports = UnhandledRejection
