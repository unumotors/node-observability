const test = require('ava')
const UnhandledRejection = require('../../lib/unhandledrejection')

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
  console.log(x)
  x.init()
  process.on = temp
})

// I tried adding a test for code inside the block but its hard since ava catches unhandled exceptions

test('Allow disabling UnhandledRejection handler', async t => {
  t.plan(1)
  const x = new UnhandledRejection()
  const temp = process.exit
  process.exit = function(code) {
    t.fail(code, 'was called')
  }

  x.init({ exitOnError: false })
  x.exitFunction()
  process.exit = temp
  t.pass()
})

test('exits with error code when enabled (passed value)', async t => {
  t.plan(1)
  const x = new UnhandledRejection()

  // the function that is called when enabled is process.exit
  const temp = process.exit
  process.exit = function(code) {
    t.is(code, 1)
  }

  x.init({ exitOnError: true })
  x.exitFunction(1)
  process.exit = temp
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
