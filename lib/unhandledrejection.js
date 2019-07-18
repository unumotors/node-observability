// By default if you include sentry the default unhandledRejection handler
// Doesn't fire so you loose visibility
// https://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html
const Sentry = require('@sentry/node')
const util = require('util')

const nextTick = util.promisify(process.nextTick)

class UnhandledRejection {
  init(config = {}) {
    // null op exit function
    this.exitFunction = () => {}
    // Override to default exit with error code
    if (config.exitOnError === undefined || config.exitOnError) {
      this.exitFunction = process.exit
    }

    // Has to be in a fat arrow function so we can call this internally
    process.on('unhandledRejection', async(error) => this.rejectionHandler(error))
  }

  async rejectionHandler(err) {
    console.warn('UnhandledPromiseRejectionWarning: Error:', err.message, err)
    // Sentry already catches UnhandledPromiseRejectionWarning
    // but we have to put the flush on a differnt event loop in order to not duplicate the errors being sent
    // so we simply wait for it to clear its queues
    //wait to send any outstanding errors to sentry
    let client = this.getClient()
    if (client) {
      // this needs to be in a separate event cycle
      await nextTick()
      await client.flush(5000)
    }
    this.exitFunction(1)
  }

  getClient() {
    return Sentry.getCurrentHub().getClient()
  }
}

module.exports = UnhandledRejection
