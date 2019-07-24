const test = require('ava')
const sentry = require('../../lib/sentry')

test('given the production NODE_ENV sentry is not enabled it throws an error', t => {
  process.env.NODE_ENV = 'production'

  const err = t.throws(() => sentry.init({}))
  t.regex(err.message, /Sentry not enabled in production env/)
})

test('given the development NODE_ENV sentry does not throw an error', t => {
  process.env.NODE_ENV = 'development'

  t.notThrows(() => sentry.init({}))
})

test('given the development NODE_ENV and dsn sentry works', t => {
  process.env.NODE_ENV = 'development'

  t.notThrows(() => sentry.init({ dsn: 'https://na@sentry.io/1234' }))
})
