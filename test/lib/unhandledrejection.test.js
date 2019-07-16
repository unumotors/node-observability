const test = require('ava')
const UnhandledRejection = require('../../lib/unhandledrejection')
const Sentry = require('@sentry/node')

test('return type of UnhandledRejection', t => {
  t.truthy(UnhandledRejection)
})

test('Registers global handler by default', async t => {
  t.plan(2)
  const temp = process.on
  process.on = function(name, callback) {
    t.is(name, 'unhandledRejection')
    t.truthy(callback)
  }
  const x = new UnhandledRejection()
  x.init()
  process.on = temp
})

// I tried adding a test for code inside the block but its hard since ava catches unhandled exceptions

test('Allow disabling UnhandledRejection handler exiting', async t => {
  t.plan(4)
  const x = new UnhandledRejection()
  const temp = process.exit
  const logTemp = console.warn

  console.warn = function(title, msg, err) {
    t.is(title, 'UnhandledPromiseRejectionWarning: Error:')
    t.is(msg, 'exit error')
    t.truthy(err)
  }
  process.exit = function(code) {
    t.fail(code, 'was called')
  }

  x.init({ exitOnError: false })
  x.rejectionHandler(new Error('exit error'))
  process.exit = temp
  console.warn = logTemp
  t.pass()
})


test('Sentry should clear its queues before exiting', async t => {
  Sentry.init()
  t.plan(6)
  const x = new UnhandledRejection()
  const temp = process.exit
  const logTemp = console.warn

  console.warn = function(title, msg, err) {
    t.is(title, 'UnhandledPromiseRejectionWarning: Error:')
    t.is(msg, 'exit error')
    t.truthy(err)
  }
  // Verifies that exit was called
  process.exit = function(code) {
    t.is(code, 1)
  }

  // Verifies that flush was called
  x.getClient = function() {
    return { flush: (val) => t.is(val, 5000) }
  }

  x.init({ exitOnError: true })

  await x.rejectionHandler(new Error('exit error'))
  process.exit = temp
  console.warn = logTemp
  t.pass()
})

test('exits with error code when enabled (passed value)', async t => {
  t.plan(4)
  const x = new UnhandledRejection()

  // the function that is called when enabled is process.exit
  const temp = process.exit
  const logTemp = console.warn
  process.exit = function(code) {
    t.is(code, 1)
  }

  console.warn = function(title, msg, err) {
    t.is(title, 'UnhandledPromiseRejectionWarning: Error:')
    t.is(msg, 'exit error')
    t.truthy(err)
  }

  x.init({ exitOnError: true })
  await x.rejectionHandler(new Error('exit error'))
  process.exit = temp
  console.warn = logTemp
})

test('exit by default', async t => {
  t.plan(1)
  const x = new UnhandledRejection()

  const temp = process.exit
  // the function that is called when enabled is process.exit
  process.exit = function(code) {
    t.is(code, 1)
  }

  x.init()
  x.exitFunction(1)
  process.exit = temp
})
