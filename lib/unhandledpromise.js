// By default if you include sentry the default unhandledRejection handler
// Doesn't fire so you loose visibility
// https://thecodebarbarian.com/unhandled-promise-rejections-in-node.js.html
process.on('unhandledRejection', function(err) {
  console.log('UnhandledPromiseRejectionWarning: Error:', err.message, err)
  // TODO exit gracefully (send events to sentry and such)
  process.exit(1)
})
